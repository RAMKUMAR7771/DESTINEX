"""DESTINEX local MVP: a self-contained Python + SQLite travel marketplace."""
from __future__ import annotations

import hashlib
import hmac
import json
import os
import secrets
import sqlite3
import threading
from datetime import date, datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse


ROOT = Path(__file__).resolve().parent
WEB = ROOT / "web"
DB_PATH = Path(os.environ.get("DESTINEX_DB", ROOT / "data" / "destinex.sqlite3"))
HOST = os.environ.get("DESTINEX_HOST", "127.0.0.1")
PORT = int(os.environ.get("DESTINEX_PORT", "8000"))
COOKIE = "destinex_session"
LOCK = threading.RLock()

DESTINATIONS = {
    "Visakhapatnam & Araku": {
        "region": "Andhra Pradesh", "tagline": "Coastline mornings, coffee hills by afternoon.", "starting": 2600,
        "activities": [
            {"name": "Kailasagiri viewpoint", "kind": "nature", "cost": 80, "time": "Morning", "detail": "Ride the hilltop ropeway for a wide view of the Bay of Bengal."},
            {"name": "RK Beach & Submarine Museum", "kind": "culture", "cost": 120, "time": "Late morning", "detail": "Walk the seafront and explore a submarine museum with a local host."},
            {"name": "Borra Caves", "kind": "adventure", "cost": 250, "time": "Morning", "detail": "See dramatic limestone formations in the Eastern Ghats."},
            {"name": "Araku coffee estate", "kind": "food", "cost": 350, "time": "Afternoon", "detail": "Taste locally grown coffee and learn how the valley harvests it."},
            {"name": "Tribal Museum", "kind": "culture", "cost": 100, "time": "Afternoon", "detail": "Discover the craft, music and daily life of Araku communities."},
            {"name": "Yarada Beach", "kind": "nature", "cost": 0, "time": "Sunset", "detail": "Finish the day at a quieter cove between green hills."},
        ]},
    "Tirupati": {
        "region": "Andhra Pradesh", "tagline": "A thoughtful pilgrimage through the Tirumala hills.", "starting": 2200,
        "activities": [
            {"name": "Sri Venkateswara Temple", "kind": "culture", "cost": 300, "time": "Early morning", "detail": "Plan darshan timing and local etiquette with a knowledgeable guide."},
            {"name": "Sri Vari Museum", "kind": "culture", "cost": 0, "time": "Late morning", "detail": "Explore the temple's history, art and traditions."},
            {"name": "Akasa Ganga waterfall", "kind": "nature", "cost": 80, "time": "Afternoon", "detail": "Visit a sacred waterfall tucked into the forested hills."},
            {"name": "Kapila Theertham", "kind": "culture", "cost": 0, "time": "Morning", "detail": "See the ancient temple and waterfall at the foot of Tirumala."},
            {"name": "Local prasadam & tiffin trail", "kind": "food", "cost": 250, "time": "Evening", "detail": "Sample regional vegetarian favourites around Tirupati."},
            {"name": "Talakona forest walk", "kind": "adventure", "cost": 150, "time": "Morning", "detail": "Take an easy guided walk through the forest reserve."},
        ]},
    "Jaipur": {
        "region": "Rajasthan", "tagline": "Pink City lanes, palace stories and a proper lassi stop.", "starting": 3100,
        "activities": [
            {"name": "Amber Fort", "kind": "culture", "cost": 550, "time": "Morning", "detail": "Trace the courtyards and hilltop views with a local history guide."},
            {"name": "Hawa Mahal & old city", "kind": "culture", "cost": 100, "time": "Late morning", "detail": "Walk the rose-coloured lanes and learn the stories behind the facades."},
            {"name": "City Palace", "kind": "culture", "cost": 500, "time": "Afternoon", "detail": "Explore royal collections, courtyards and artisan details."},
            {"name": "Johari Bazaar food walk", "kind": "food", "cost": 450, "time": "Evening", "detail": "Taste kachori, sweets and lassi at trusted neighbourhood stalls."},
            {"name": "Jal Mahal lakeside", "kind": "nature", "cost": 0, "time": "Sunset", "detail": "Pause for a lakeside view of the Water Palace."},
            {"name": "Nahargarh sunset trail", "kind": "adventure", "cost": 100, "time": "Sunset", "detail": "Take a short hill walk to a sweeping view of the city."},
        ]},
    "Kochi": {
        "region": "Kerala", "tagline": "Harbour history, spice-scented lanes and backwater light.", "starting": 2900,
        "activities": [
            {"name": "Fort Kochi heritage walk", "kind": "culture", "cost": 100, "time": "Morning", "detail": "Find layered Portuguese, Dutch and Malabari stories in the old quarter."},
            {"name": "Chinese fishing nets", "kind": "culture", "cost": 0, "time": "Sunset", "detail": "Watch the working harbour and its famous cantilevered nets."},
            {"name": "Mattancherry Palace", "kind": "culture", "cost": 20, "time": "Late morning", "detail": "See Kerala murals and the history of the spice trade."},
            {"name": "Jew Town spice & craft lane", "kind": "food", "cost": 250, "time": "Afternoon", "detail": "Meet shopkeepers and taste the aromas of the old trading quarter."},
            {"name": "Kumbalangi village visit", "kind": "nature", "cost": 500, "time": "Afternoon", "detail": "Spend time in a community-led island village."},
            {"name": "Kathakali introduction", "kind": "culture", "cost": 400, "time": "Evening", "detail": "Learn the gestures and make-up behind Kerala's classical theatre."},
        ]},
    "Hampi": {
        "region": "Karnataka", "tagline": "A slow wander through an open-air stone kingdom.", "starting": 2400,
        "activities": [
            {"name": "Virupaksha Temple & bazaar", "kind": "culture", "cost": 0, "time": "Morning", "detail": "Walk the temple street and hear how Hampi became a great city."},
            {"name": "Vijaya Vittala Temple", "kind": "culture", "cost": 600, "time": "Morning", "detail": "See the stone chariot and musical-pillared halls."},
            {"name": "Tungabhadra riverside", "kind": "nature", "cost": 0, "time": "Sunset", "detail": "Take a quiet break beside the boulder-lined river."},
            {"name": "Matanga Hill walk", "kind": "adventure", "cost": 0, "time": "Sunrise", "detail": "Climb an easy rocky trail for a panoramic sunrise."},
            {"name": "Banana plantation lunch", "kind": "food", "cost": 350, "time": "Afternoon", "detail": "Try a local thali in a leafy riverside setting."},
            {"name": "Anegundi village cycle", "kind": "adventure", "cost": 300, "time": "Afternoon", "detail": "Cycle between small temples, farms and village lanes."},
        ]},
}

GUIDE_SEEDS = [
    {"name": "Ravi Kumar", "email": "guide@destinex.demo", "place": "Visakhapatnam & Araku", "languages": ["English", "Telugu", "Hindi"], "rate": 3000, "years": 9, "specialty": "Coast & coffee country", "bio": "Born in Vizag, I help visitors connect the coastline, hill railway and Araku valley without rushing.", "rating": 4.9, "reviews": 42, "verified": True},
    {"name": "Anjali Reddy", "email": "anjali.guide@destinex.demo", "place": "Tirupati", "languages": ["Telugu", "English", "Hindi"], "rate": 2400, "years": 7, "specialty": "Pilgrimage & local food", "bio": "I make temple visits easier to plan and love sharing the everyday food culture of Tirupati.", "rating": 4.9, "reviews": 31, "verified": True},
    {"name": "Meera Sharma", "email": "meera.guide@destinex.demo", "place": "Jaipur", "languages": ["Hindi", "English", "French"], "rate": 3600, "years": 8, "specialty": "Heritage & food walks", "bio": "Architectural details, family-friendly routes and favourite neighbourhood kitchens are my thing.", "rating": 4.8, "reviews": 56, "verified": True},
    {"name": "Farah Thomas", "email": "farah.guide@destinex.demo", "place": "Kochi", "languages": ["Malayalam", "English", "Hindi"], "rate": 3200, "years": 6, "specialty": "History & backwaters", "bio": "Let's explore the layers of Fort Kochi and the communities around the harbour.", "rating": 5.0, "reviews": 24, "verified": True},
    {"name": "Prakash Hegde", "email": "prakash.guide@destinex.demo", "place": "Hampi", "languages": ["Kannada", "English", "Hindi"], "rate": 2700, "years": 11, "specialty": "Ruins & easy hikes", "bio": "A patient storyteller for sunrise walks, temple ruins and the old river paths.", "rating": 4.8, "reviews": 37, "verified": True},
]


def connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(DB_PATH, timeout=20)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys=ON")
    db.execute("PRAGMA journal_mode=WAL")
    return db


def hash_password(password: str, salt: bytes | None = None) -> str:
    salt = salt or secrets.token_bytes(16)
    derived = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 240_000)
    return salt.hex() + ":" + derived.hex()


def verify_password(password: str, stored: str) -> bool:
    try:
        salt_hex, digest = stored.split(":", 1)
        return hmac.compare_digest(hash_password(password, bytes.fromhex(salt_hex)), salt_hex + ":" + digest)
    except (ValueError, TypeError):
        return False


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def init_db() -> None:
    with LOCK, connect() as db:
        db.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('traveler','guide','admin')),
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS sessions (
            token TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            expires_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS guides (
            id INTEGER PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            name TEXT NOT NULL, place TEXT NOT NULL, languages TEXT NOT NULL, rate INTEGER NOT NULL,
            years INTEGER NOT NULL DEFAULT 0, specialty TEXT NOT NULL DEFAULT '', bio TEXT NOT NULL DEFAULT '',
            rating REAL NOT NULL DEFAULT 0, reviews INTEGER NOT NULL DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','verified','rejected','paused')),
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS plans (
            id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            destination TEXT NOT NULL, days INTEGER NOT NULL, budget INTEGER NOT NULL, interests TEXT NOT NULL,
            plan_json TEXT NOT NULL, created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            plan_id INTEGER NOT NULL REFERENCES plans(id) ON DELETE CASCADE, title TEXT NOT NULL,
            category TEXT NOT NULL, amount INTEGER NOT NULL CHECK(amount > 0), spent_on TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY, traveler_id INTEGER NOT NULL REFERENCES users(id),
            guide_id INTEGER NOT NULL REFERENCES guides(id), destination TEXT NOT NULL,
            trip_date TEXT NOT NULL, guests INTEGER NOT NULL DEFAULT 1, note TEXT NOT NULL DEFAULT '',
            amount INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'pending'
                CHECK(status IN ('pending','confirmed','declined','cancelled','completed')),
            payment_status TEXT NOT NULL DEFAULT 'unpaid'
                CHECK(payment_status IN ('unpaid','demo_paid','refunded')),
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS reviews (
            id INTEGER PRIMARY KEY, booking_id INTEGER NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
            traveler_id INTEGER NOT NULL REFERENCES users(id), guide_id INTEGER NOT NULL REFERENCES guides(id),
            rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5), comment TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_bookings_traveler ON bookings(traveler_id);
        CREATE INDEX IF NOT EXISTS idx_bookings_guide ON bookings(guide_id);
        CREATE INDEX IF NOT EXISTS idx_expenses_plan ON expenses(plan_id);
        """)
        if db.execute("SELECT COUNT(*) FROM users").fetchone()[0] == 0:
            demo_users = [
                ("Vardhan", "traveler@destinex.demo", "travel123!", "traveler"),
                ("Ravi Kumar", "guide@destinex.demo", "guide123!", "guide"),
                ("DESTINEX Admin", "admin@destinex.demo", "admin123!", "admin"),
                ("Sravani Devi", "sravani.guide@destinex.demo", "guide123!", "guide"),
            ]
            for name, email, password, role in demo_users:
                db.execute("INSERT INTO users(name,email,password_hash,role,created_at) VALUES(?,?,?,?,?)", (name, email, hash_password(password), role, utc_now()))
            for seed in GUIDE_SEEDS:
                user = db.execute("SELECT id FROM users WHERE email=?", (seed["email"],)).fetchone()
                uid = user["id"] if user else None
                if user is None:
                    created_user = db.execute("INSERT INTO users(name,email,password_hash,role,created_at) VALUES(?,?,?,?,?)", (seed["name"], seed["email"], hash_password("guide123!"), "guide", utc_now()))
                    uid = created_user.lastrowid
                else:
                    uid = user["id"]
                db.execute("INSERT INTO guides(user_id,name,place,languages,rate,years,specialty,bio,rating,reviews,status,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
                           (uid, seed["name"], seed["place"], json.dumps(seed["languages"]), seed["rate"], seed["years"], seed["specialty"], seed["bio"], seed["rating"], seed["reviews"], "verified", utc_now()))
            # A realistic admin review queue demonstrates guide verification.
            pending_guide_user = db.execute("SELECT id FROM users WHERE email='sravani.guide@destinex.demo'").fetchone()
            db.execute("INSERT INTO guides(user_id,name,place,languages,rate,years,specialty,bio,status,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)",
                       (pending_guide_user["id"], "Sravani Devi", "Visakhapatnam & Araku", json.dumps(["Telugu", "English"]), 2800, 4, "Araku village walks", "I lead small, locally focused walks through the coffee villages around Araku.", "pending", utc_now()))


def row_dict(row: sqlite3.Row | None) -> dict | None:
    return dict(row) if row else None


def public_guide(row: sqlite3.Row) -> dict:
    data = dict(row)
    data["languages"] = json.loads(data["languages"])
    data["verified"] = data["status"] == "verified"
    return data


def make_plan(payload: dict) -> dict:
    destination = str(payload.get("destination", "Visakhapatnam & Araku"))
    if destination not in DESTINATIONS:
        raise ValueError("Choose one of the listed destinations.")
    try:
        days = max(1, min(7, int(payload.get("days", 3))))
        budget = max(1000, min(2_000_000, int(payload.get("budget", 9000))))
    except (TypeError, ValueError):
        raise ValueError("Enter a valid trip length and budget.")
    interests = payload.get("interests", [])
    if isinstance(interests, str):
        interests = [part.strip() for part in interests.split(",") if part.strip()]
    interests = [str(x).lower() for x in interests if str(x).lower() in {"culture", "nature", "food", "adventure"}]
    place = DESTINATIONS[destination]
    activities = place["activities"]
    if interests:
        preferred = [x for x in activities if x["kind"] in interests]
        other = [x for x in activities if x["kind"] not in interests]
        activities = preferred + other
    plan_days = []
    for index in range(days):
        picked = [activities[(index * 2) % len(activities)], activities[(index * 2 + 1) % len(activities)]]
        if days > 1:
            picked.append(activities[(index * 2 + 2) % len(activities)])
        plan_days.append({"day": index + 1, "title": ["Find your bearings", "Meet the local rhythm", "Take the scenic route", "Go a little deeper", "Make room to wander", "Your favourite bits, slower", "A final local morning"][min(index, 6)], "activities": picked})
    lodging = round(budget * 0.32 / days)
    meals = round(budget * 0.24 / days)
    transport = round(budget * 0.18 / days)
    experiences = round(budget * 0.16 / days)
    buffer = max(0, round((budget - (lodging + meals + transport + experiences) * days)))
    per_day = {"stay": lodging, "food": meals, "transport": transport, "experiences": experiences}
    plan = {
        "destination": destination, "region": place["region"], "tagline": place["tagline"],
        "days": days, "budget": budget, "interests": interests, "daily_budget": per_day,
        "estimated_total": sum(per_day.values()) * days, "buffer": buffer,
        "budget_breakdown": [
            {"label": "Stay", "amount": lodging * days, "share": 32},
            {"label": "Food", "amount": meals * days, "share": 24},
            {"label": "Local transport", "amount": transport * days, "share": 18},
            {"label": "Experiences", "amount": experiences * days, "share": 16},
            {"label": "Flex fund", "amount": buffer, "share": round(buffer / budget * 100)},
        ], "itinerary": plan_days,
        "disclaimer": "Estimates are planning ranges, not live quotes. Confirm timings and entry fees locally.",
    }
    return plan


class DestinexHandler(BaseHTTPRequestHandler):
    server_version = "DESTINEX/1.0"
    sys_version = ""

    def log_message(self, fmt, *args):
        print(f"[{self.log_date_time_string()}] {self.address_string()} {fmt % args}")

    def send_json(self, data: dict, status: int = 200, headers: dict | None = None):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        if headers:
            for key, value in headers.items():
                self.send_header(key, value)
        self.end_headers()
        self.wfile.write(body)

    def body_json(self) -> dict:
        length = min(int(self.headers.get("Content-Length", "0")), 1_000_000)
        if length == 0:
            return {}
        try:
            body = json.loads(self.rfile.read(length))
            if not isinstance(body, dict):
                raise ValueError("Request body must be an object.")
            return body
        except (json.JSONDecodeError, UnicodeDecodeError):
            raise ValueError("Request body must be valid JSON.")

    def current_user(self, db: sqlite3.Connection) -> dict | None:
        cookie = self.headers.get("Cookie", "")
        token = next((item.strip().split("=", 1)[1] for item in cookie.split(";") if item.strip().startswith(COOKIE + "=")), None)
        if not token:
            return None
        row = db.execute("SELECT u.id,u.name,u.email,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND s.expires_at>?", (token, utc_now())).fetchone()
        return row_dict(row)

    def require_user(self, db: sqlite3.Connection, roles: tuple[str, ...] = ()) -> dict:
        user = self.current_user(db)
        if not user:
            raise PermissionError("Please sign in to continue.")
        if roles and user["role"] not in roles:
            raise PermissionError("This action is not available for your account.")
        return user

    def do_GET(self):
        parsed = urlparse(self.path)
        path = unquote(parsed.path)
        qs = parse_qs(parsed.query)
        if path == "/api/health":
            return self.send_json({"ok": True, "product": "DESTINEX", "mode": "local-mvp"})
        if not path.startswith("/api/"):
            return self.serve_static(path)
        try:
            with LOCK, connect() as db:
                user = self.current_user(db)
                if path == "/api/bootstrap":
                    guides = [public_guide(row) for row in db.execute("SELECT * FROM guides WHERE status='verified' ORDER BY rating DESC,name")]
                    self.send_json({"user": user, "destinations": [{"name": name, "region": d["region"], "tagline": d["tagline"], "starting": d["starting"]} for name, d in DESTINATIONS.items()], "guides": guides, "languages": sorted({lang for guide in guides for lang in guide["languages"]})})
                elif path == "/api/guides":
                    dest = qs.get("destination", [""])[0]
                    language = qs.get("language", [""])[0].lower()
                    where, args = ["status='verified'"], []
                    if dest:
                        where.append("place=?"); args.append(dest)
                    rows = db.execute("SELECT * FROM guides WHERE " + " AND ".join(where) + " ORDER BY rating DESC,name", args)
                    guides = [public_guide(r) for r in rows]
                    if language:
                        guides = [g for g in guides if any(language == x.lower() for x in g["languages"])]
                    self.send_json({"guides": guides})
                elif path == "/api/plans":
                    user = self.require_user(db, ("traveler",))
                    plans = [dict(r) for r in db.execute("SELECT * FROM plans WHERE user_id=? ORDER BY id DESC", (user["id"],))]
                    for p in plans:
                        p["plan"] = json.loads(p.pop("plan_json"))
                        p["interests"] = json.loads(p["interests"])
                    self.send_json({"plans": plans})
                elif path == "/api/expenses":
                    user = self.require_user(db, ("traveler",))
                    plan_id = int(qs.get("plan_id", ["0"])[0] or 0)
                    plan = db.execute("SELECT * FROM plans WHERE id=? AND user_id=?", (plan_id, user["id"])).fetchone()
                    if not plan:
                        raise ValueError("Choose a saved itinerary first.")
                    expenses = [dict(r) for r in db.execute("SELECT * FROM expenses WHERE plan_id=? ORDER BY spent_on DESC,id DESC", (plan_id,))]
                    self.send_json({"expenses": expenses, "plan": {"id": plan["id"], "budget": plan["budget"], "destination": plan["destination"]}, "total": sum(x["amount"] for x in expenses)})
                elif path == "/api/bookings":
                    user = self.require_user(db)
                    if user["role"] == "traveler":
                        rows = db.execute("SELECT b.*,g.name guide_name,g.place,g.languages FROM bookings b JOIN guides g ON b.guide_id=g.id WHERE b.traveler_id=? ORDER BY b.trip_date DESC,b.id DESC", (user["id"],))
                    elif user["role"] == "guide":
                        rows = db.execute("SELECT b.*,u.name traveler_name,g.name guide_name,g.place FROM bookings b JOIN guides g ON b.guide_id=g.id JOIN users u ON b.traveler_id=u.id WHERE g.user_id=? ORDER BY b.trip_date,b.id DESC", (user["id"],))
                    else:
                        rows = db.execute("SELECT b.*,u.name traveler_name,g.name guide_name,g.place FROM bookings b JOIN guides g ON b.guide_id=g.id JOIN users u ON b.traveler_id=u.id ORDER BY b.trip_date DESC,b.id DESC LIMIT 100")
                    bookings = [dict(r) for r in rows]
                    for b in bookings:
                        b["reviewed"] = bool(db.execute("SELECT 1 FROM reviews WHERE booking_id=?", (b["id"],)).fetchone())
                    self.send_json({"bookings": bookings})
                elif path == "/api/guide/profile":
                    user = self.require_user(db, ("guide",))
                    row = db.execute("SELECT * FROM guides WHERE user_id=? ORDER BY id DESC LIMIT 1", (user["id"],)).fetchone()
                    self.send_json({"guide": public_guide(row) if row else None})
                elif path == "/api/admin/guide-applications":
                    self.require_user(db, ("admin",))
                    rows = [public_guide(r) for r in db.execute("SELECT * FROM guides WHERE status='pending' ORDER BY created_at")]
                    self.send_json({"applications": rows})
                elif path == "/api/admin/metrics":
                    self.require_user(db, ("admin",))
                    self.send_json({"metrics": {
                        "guides": db.execute("SELECT COUNT(*) FROM guides WHERE status='verified'").fetchone()[0],
                        "pending": db.execute("SELECT COUNT(*) FROM guides WHERE status='pending'").fetchone()[0],
                        "bookings": db.execute("SELECT COUNT(*) FROM bookings").fetchone()[0],
                        "volume": db.execute("SELECT COALESCE(SUM(amount),0) FROM bookings WHERE payment_status='demo_paid'").fetchone()[0],
                    }})
                else:
                    self.send_json({"error": "Not found."}, 404)
        except PermissionError as e:
            self.send_json({"error": str(e)}, 401)
        except (ValueError, sqlite3.Error) as e:
            self.send_json({"error": str(e)}, 400)

    def do_POST(self):
        path = unquote(urlparse(self.path).path)
        try:
            payload = self.body_json()
            with LOCK, connect() as db:
                if path == "/api/auth/login":
                    email = str(payload.get("email", "")).strip().lower()
                    password = str(payload.get("password", ""))
                    user = db.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
                    if not user or not verify_password(password, user["password_hash"]):
                        raise PermissionError("Email or password is incorrect.")
                    token = secrets.token_urlsafe(32)
                    db.execute("INSERT INTO sessions(token,user_id,expires_at) VALUES(?,?,?)", (token, user["id"], (datetime.now(timezone.utc) + timedelta(days=14)).isoformat(timespec="seconds")))
                    self.send_json({"user": {"id": user["id"], "name": user["name"], "email": user["email"], "role": user["role"]}}, headers={"Set-Cookie": f"{COOKIE}={token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=1209600"})
                elif path == "/api/auth/signup":
                    name, email, password = str(payload.get("name", "")).strip(), str(payload.get("email", "")).strip().lower(), str(payload.get("password", ""))
                    role = str(payload.get("role", "traveler"))
                    if len(name) < 2 or len(name) > 80 or "@" not in email or len(email) > 180 or len(password) < 8:
                        raise ValueError("Enter your name, a valid email and a password with at least 8 characters.")
                    if role not in ("traveler", "guide"):
                        raise ValueError("Choose a traveller or local guide account.")
                    db.execute("INSERT INTO users(name,email,password_hash,role,created_at) VALUES(?,?,?,?,?)", (name, email, hash_password(password), role, utc_now()))
                    user = db.execute("SELECT id,name,email,role FROM users WHERE email=?", (email,)).fetchone()
                    token = secrets.token_urlsafe(32)
                    db.execute("INSERT INTO sessions(token,user_id,expires_at) VALUES(?,?,?)", (token, user["id"], (datetime.now(timezone.utc) + timedelta(days=14)).isoformat(timespec="seconds")))
                    self.send_json({"user": dict(user)}, 201, {"Set-Cookie": f"{COOKIE}={token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=1209600"})
                elif path == "/api/auth/logout":
                    token = self.session_token()
                    if token:
                        db.execute("DELETE FROM sessions WHERE token=?", (token,))
                    self.send_json({"ok": True}, headers={"Set-Cookie": f"{COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0"})
                elif path == "/api/plans":
                    user = self.require_user(db, ("traveler",))
                    plan = make_plan(payload)
                    cur = db.execute("INSERT INTO plans(user_id,destination,days,budget,interests,plan_json,created_at) VALUES(?,?,?,?,?,?,?)", (user["id"], plan["destination"], plan["days"], plan["budget"], json.dumps(plan["interests"]), json.dumps(plan, ensure_ascii=False), utc_now()))
                    plan["id"] = cur.lastrowid
                    self.send_json({"plan": plan}, 201)
                elif path == "/api/expenses":
                    user = self.require_user(db, ("traveler",))
                    plan_id, title = int(payload.get("plan_id", 0)), str(payload.get("title", "")).strip()[:100]
                    category, amount = str(payload.get("category", "Other"))[:40], int(payload.get("amount", 0))
                    spent_on = str(payload.get("spent_on", date.today().isoformat()))
                    if not title or amount < 1 or amount > 2_000_000:
                        raise ValueError("Enter an expense name and an amount above ₹0.")
                    date.fromisoformat(spent_on)
                    if not db.execute("SELECT 1 FROM plans WHERE id=? AND user_id=?", (plan_id, user["id"])).fetchone():
                        raise ValueError("Itinerary not found.")
                    cur = db.execute("INSERT INTO expenses(user_id,plan_id,title,category,amount,spent_on,created_at) VALUES(?,?,?,?,?,?,?)", (user["id"], plan_id, title, category, amount, spent_on, utc_now()))
                    self.send_json({"expense": {"id": cur.lastrowid, "plan_id": plan_id, "title": title, "category": category, "amount": amount, "spent_on": spent_on}}, 201)
                elif path == "/api/bookings":
                    user = self.require_user(db, ("traveler",))
                    guide_id = int(payload.get("guide_id", 0))
                    guide = db.execute("SELECT * FROM guides WHERE id=? AND status='verified'", (guide_id,)).fetchone()
                    if not guide:
                        raise ValueError("This guide is not available for booking.")
                    trip_date = str(payload.get("trip_date", ""))
                    try:
                        chosen = date.fromisoformat(trip_date)
                    except ValueError:
                        raise ValueError("Choose a valid trip date.")
                    if chosen < date.today():
                        raise ValueError("Choose a future trip date.")
                    guests = max(1, min(20, int(payload.get("guests", 1))))
                    note = str(payload.get("note", "")).strip()[:500]
                    cur = db.execute("INSERT INTO bookings(traveler_id,guide_id,destination,trip_date,guests,note,amount,status,payment_status,created_at) VALUES(?,?,?,?,?,?,?,'pending','unpaid',?)", (user["id"], guide_id, guide["place"], trip_date, guests, note, guide["rate"], utc_now()))
                    self.send_json({"booking_id": cur.lastrowid, "message": "Request sent. The guide will confirm availability."}, 201)
                elif path.startswith("/api/bookings/") and path.endswith("/action"):
                    user = self.require_user(db)
                    booking_id = int(path.split("/")[3]); action = str(payload.get("action", ""))
                    booking = db.execute("SELECT b.*,g.user_id guide_user_id FROM bookings b JOIN guides g ON g.id=b.guide_id WHERE b.id=?", (booking_id,)).fetchone()
                    if not booking:
                        raise ValueError("Booking not found.")
                    if user["role"] == "guide" and booking["guide_user_id"] == user["id"] and booking["status"] == "pending" and action in ("confirm", "decline"):
                        status = "confirmed" if action == "confirm" else "declined"
                    elif user["role"] == "guide" and booking["guide_user_id"] == user["id"] and booking["status"] == "confirmed" and booking["payment_status"] == "demo_paid" and action == "complete":
                        status = "completed"
                    elif user["role"] == "traveler" and booking["traveler_id"] == user["id"] and booking["status"] in ("pending", "confirmed") and action == "cancel":
                        status = "cancelled"
                    else:
                        raise PermissionError("That booking action is not available.")
                    if status == "cancelled" and booking["payment_status"] == "demo_paid":
                        db.execute("UPDATE bookings SET status=?,payment_status='refunded' WHERE id=?", (status, booking_id))
                    else:
                        db.execute("UPDATE bookings SET status=? WHERE id=?", (status, booking_id))
                    self.send_json({"ok": True, "status": status})
                elif path.startswith("/api/bookings/") and path.endswith("/pay"):
                    user = self.require_user(db, ("traveler",))
                    booking_id = int(path.split("/")[3])
                    booking = db.execute("SELECT * FROM bookings WHERE id=? AND traveler_id=?", (booking_id, user["id"])).fetchone()
                    if not booking or booking["status"] != "confirmed":
                        raise ValueError("Only confirmed bookings can be paid.")
                    if booking["payment_status"] != "unpaid":
                        raise ValueError("This booking is already paid.")
                    db.execute("UPDATE bookings SET payment_status='demo_paid' WHERE id=?", (booking_id,))
                    self.send_json({"ok": True, "payment_status": "demo_paid", "message": "Demo payment recorded. No money was charged."})
                elif path == "/api/reviews":
                    user = self.require_user(db, ("traveler",))
                    booking_id, rating = int(payload.get("booking_id", 0)), int(payload.get("rating", 5))
                    comment = str(payload.get("comment", "")).strip()[:600]
                    booking = db.execute("SELECT * FROM bookings WHERE id=? AND traveler_id=? AND status='completed' AND payment_status='demo_paid'", (booking_id, user["id"])).fetchone()
                    if not booking or rating < 1 or rating > 5:
                        raise ValueError("A review is available after a completed trip.")
                    db.execute("INSERT INTO reviews(booking_id,traveler_id,guide_id,rating,comment,created_at) VALUES(?,?,?,?,?,?)", (booking_id, user["id"], booking["guide_id"], rating, comment, utc_now()))
                    guide_stats = db.execute("SELECT rating,reviews FROM guides WHERE id=?", (booking["guide_id"],)).fetchone()
                    new_count = guide_stats["reviews"] + 1
                    new_rating = round((guide_stats["rating"] * guide_stats["reviews"] + rating) / new_count, 1)
                    db.execute("UPDATE guides SET rating=?,reviews=? WHERE id=?", (new_rating, new_count, booking["guide_id"]))
                    self.send_json({"ok": True}, 201)
                elif path == "/api/guide/apply":
                    user = self.require_user(db, ("guide",))
                    place, languages = str(payload.get("place", "")), payload.get("languages", [])
                    if place not in DESTINATIONS:
                        raise ValueError("Choose a listed destination.")
                    if isinstance(languages, str):
                        languages = [x.strip() for x in languages.split(",") if x.strip()]
                    languages = [str(x)[:32] for x in languages[:8]]
                    rate, years = int(payload.get("rate", 0)), int(payload.get("years", 0))
                    bio, specialty = str(payload.get("bio", "")).strip()[:600], str(payload.get("specialty", "")).strip()[:100]
                    if rate < 500 or rate > 100000 or years < 0 or years > 60 or len(bio) < 20 or not languages:
                        raise ValueError("Add a fair day rate, at least one language and a short introduction of 20+ characters.")
                    existing = db.execute("SELECT id FROM guides WHERE user_id=? AND status IN ('pending','verified')", (user["id"],)).fetchone()
                    if existing:
                        raise ValueError("Your guide profile is already submitted or active.")
                    cur = db.execute("INSERT INTO guides(user_id,name,place,languages,rate,years,specialty,bio,status,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)", (user["id"], user["name"], place, json.dumps(languages), rate, years, specialty, bio, "pending", utc_now()))
                    self.send_json({"guide_id": cur.lastrowid, "status": "pending"}, 201)
                elif path.startswith("/api/admin/guides/") and path.endswith("/decision"):
                    self.require_user(db, ("admin",))
                    guide_id = int(path.split("/")[4]); action = str(payload.get("action", ""))
                    if action not in ("approve", "reject"):
                        raise ValueError("Choose approve or reject.")
                    status = "verified" if action == "approve" else "rejected"
                    cur = db.execute("UPDATE guides SET status=? WHERE id=? AND status='pending'", (status, guide_id))
                    if cur.rowcount == 0:
                        raise ValueError("Pending application not found.")
                    self.send_json({"ok": True, "status": status})
                else:
                    self.send_json({"error": "Not found."}, 404)
        except PermissionError as e:
            self.send_json({"error": str(e)}, 401)
        except (ValueError, sqlite3.IntegrityError) as e:
            message = "That email is already registered." if isinstance(e, sqlite3.IntegrityError) else str(e)
            self.send_json({"error": message}, 400)
        except sqlite3.Error as e:
            self.send_json({"error": f"Storage error: {e}"}, 500)

    def session_token(self) -> str | None:
        cookie = self.headers.get("Cookie", "")
        return next((item.strip().split("=", 1)[1] for item in cookie.split(";") if item.strip().startswith(COOKIE + "=")), None)

    def serve_static(self, path: str):
        if path == "/":
            path = "/index.html"
        file_path = (WEB / path.lstrip("/")).resolve()
        if not file_path.is_relative_to(WEB.resolve()) or not file_path.is_file():
            return self.send_json({"error": "Not found."}, 404)
        mime = {".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml"}.get(file_path.suffix, "application/octet-stream")
        body = file_path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", mime)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Content-Security-Policy", "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'")
        self.end_headers()
        self.wfile.write(body)

    def do_HEAD(self):
        path = urlparse(self.path).path
        if path == "/api/health":
            return self.send_json({"ok": True})
        self.send_response(200); self.end_headers()


def main():
    init_db()
    server = ThreadingHTTPServer((HOST, PORT), DestinexHandler)
    print(f"DESTINEX is ready at http://{HOST}:{PORT}")
    print("Demo accounts: traveler@destinex.demo / travel123! | guide@destinex.demo / guide123! | admin@destinex.demo / admin123!")
    if os.environ.get("DESTINEX_OPEN_BROWSER", "1") != "0" and HOST in ("127.0.0.1", "localhost"):
        import webbrowser
        threading.Timer(0.8, lambda: webbrowser.open(f"http://{HOST}:{PORT}")).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nDESTINEX stopped.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
