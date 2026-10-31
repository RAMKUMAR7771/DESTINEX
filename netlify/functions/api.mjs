import { createHash, pbkdf2, randomBytes, timingSafeEqual } from "node:crypto";
import { getDatabase } from "@netlify/database";
import { DESTINATIONS, SUPPORTED_LANGUAGES } from "./destinations.mjs";

const db = getDatabase();
const COOKIE = "destinex_session";
const PBKDF2_ROUNDS = 240000;
let adminReady = false;

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const query = (sql, params = []) => db.sql.unsafe(sql, params);
const now = () => new Date().toISOString();
const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...headers
    }
  });

function passwordHash(password, salt = randomBytes(16)) {
  return new Promise((resolve, reject) => {
    pbkdf2(password, salt, PBKDF2_ROUNDS, 32, "sha256", (error, key) => {
      if (error) return reject(error);
      resolve(salt.toString("hex") + ":" + key.toString("hex"));
    });
  });
}

async function passwordMatches(password, saved) {
  try {
    const [saltHex, digestHex] = saved.split(":");
    const salt = Buffer.from(saltHex, "hex");
    const expected = Buffer.from(digestHex, "hex");
    if (salt.length !== 16 || expected.length !== 32) return false;
    const actual = Buffer.from(await passwordHash(password, salt).then((value) => value.split(":")[1]), "hex");
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

async function ensureAdmin() {
  if (adminReady) return;
  const email = (process.env.DESTINEX_ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.DESTINEX_ADMIN_PASSWORD || "";
  const name = (process.env.DESTINEX_ADMIN_NAME || "DESTINEX Admin").trim() || "DESTINEX Admin";
  if (!email && !password) {
    adminReady = true;
    return;
  }
  if (!email || password.length < 12 || !email.includes("@")) {
    throw new HttpError(500, "Set a valid DESTINEX_ADMIN_EMAIL and a DESTINEX_ADMIN_PASSWORD of at least 12 characters in Netlify.");
  }
  const existing = await query("SELECT id, role FROM users WHERE email=$1", [email]);
  if (existing.length && existing[0].role !== "admin") {
    throw new HttpError(500, "The configured admin email already belongs to a non-admin account.");
  }
  if (!existing.length) {
    const hashed = await passwordHash(password);
    await query(
      "INSERT INTO users(name,email,password_hash,role,created_at) VALUES($1,$2,$3,'admin',$4) ON CONFLICT(email) DO NOTHING",
      [name, email, hashed, now()]
    );
  }
  adminReady = true;
}

function sessionCookie(token, maxAge) {
  return COOKIE + "=" + token + "; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=" + maxAge;
}

function getCookie(request, name) {
  const cookie = request.headers.get("cookie") || "";
  for (const part of cookie.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return value.join("=");
  }
  return "";
}

async function currentUser(request) {
  const token = getCookie(request, COOKIE);
  if (!token) return null;
  const rows = await query(
    "SELECT u.id,u.name,u.email,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=$1 AND s.expires_at>$2",
    [token, now()]
  );
  return rows[0] || null;
}

async function requireUser(request, roles = []) {
  const user = await currentUser(request);
  if (!user) throw new HttpError(401, "Please sign in to continue.");
  if (roles.length && !roles.includes(user.role)) {
    throw new HttpError(403, "This action is not available for your account.");
  }
  return user;
}

function publicGuide(row) {
  if (!row) return null;
  const result = { ...row };
  if (typeof result.languages === "string") {
    try { result.languages = JSON.parse(result.languages); } catch { result.languages = []; }
  }
  result.verified = result.status === "verified";
  return result;
}

function makePlan(payload) {
  const destination = String(payload.destination || "Visakhapatnam & Araku");
  const place = DESTINATIONS[destination];
  if (!place) throw new HttpError(400, "Choose one of the listed destinations.");
  const daysRaw = Number(payload.days ?? 3);
  const budgetRaw = Number(payload.budget ?? 9000);
  if (!Number.isFinite(daysRaw) || !Number.isFinite(budgetRaw)) {
    throw new HttpError(400, "Enter a valid trip length and budget.");
  }
  const days = clamp(Math.trunc(daysRaw), 1, 7);
  const budget = clamp(Math.trunc(budgetRaw), 1000, 2000000);
  let interests = payload.interests || [];
  if (typeof interests === "string") interests = interests.split(",").map((x) => x.trim()).filter(Boolean);
  if (!Array.isArray(interests)) interests = [];
  interests = interests.map((x) => String(x).toLowerCase()).filter((x) => ["culture", "nature", "food", "adventure"].includes(x));
  let activities = place.activities;
  if (interests.length) {
    activities = activities.filter((x) => interests.includes(x.kind)).concat(activities.filter((x) => !interests.includes(x.kind)));
  }
  const titles = ["Find your bearings", "Meet the local rhythm", "Take the scenic route", "Go a little deeper", "Make room to wander", "Your favourite bits, slower", "A final local morning"];
  const itinerary = [];
  for (let i = 0; i < days; i += 1) {
    const picked = [activities[(i * 2) % activities.length], activities[(i * 2 + 1) % activities.length]];
    if (days > 1) picked.push(activities[(i * 2 + 2) % activities.length]);
    itinerary.push({ day: i + 1, title: titles[Math.min(i, 6)], activities: picked });
  }
  const lodging = Math.round(budget * 0.32 / days);
  const meals = Math.round(budget * 0.24 / days);
  const transport = Math.round(budget * 0.18 / days);
  const experiences = Math.round(budget * 0.16 / days);
  const buffer = Math.max(0, Math.round(budget - (lodging + meals + transport + experiences) * days));
  const daily_budget = { stay: lodging, food: meals, transport, experiences };
  return {
    destination, region: place.region, tagline: place.tagline, days, budget, interests, daily_budget,
    estimated_total: (lodging + meals + transport + experiences) * days,
    buffer,
    budget_breakdown: [
      { label: "Stay", amount: lodging * days, share: 32 },
      { label: "Food", amount: meals * days, share: 24 },
      { label: "Local transport", amount: transport * days, share: 18 },
      { label: "Experiences", amount: experiences * days, share: 16 },
      { label: "Flex fund", amount: buffer, share: Math.round(buffer / budget * 100) }
    ],
    itinerary,
    disclaimer: "Estimates are planning ranges, not live quotes. Confirm timings and entry fees locally."
  };
}

async function requestBody(request) {
  const text = await request.text();
  if (text.length > 1000000) throw new HttpError(413, "Request is too large.");
  if (!text) return {};
  try {
    const body = JSON.parse(text);
    if (!body || Array.isArray(body) || typeof body !== "object") throw new Error();
    return body;
  } catch {
    throw new HttpError(400, "Request body must be valid JSON.");
  }
}

async function handleGet(request, path, url) {
  if (path === "/api/health") {
    return json({ ok: true, product: "DESTINEX", mode: "public" });
  }
  if (path === "/api/bootstrap") {
    const user = await currentUser(request);
    const rows = await query("SELECT * FROM guides WHERE status='verified' ORDER BY rating DESC,name");
    const guides = rows.map(publicGuide);
    const destinations = Object.entries(DESTINATIONS).map(([name, d]) => ({
      name, region: d.region, tagline: d.tagline, starting: d.starting
    }));
    const languages = [...new Set([...SUPPORTED_LANGUAGES, ...guides.flatMap((guide) => guide.languages || [])])];
    return json({ user, demo_mode: false, destinations, guides, languages });
  }
  if (path === "/api/guides") {
    const destination = url.searchParams.get("destination") || "";
    const language = (url.searchParams.get("language") || "").toLowerCase();
    const rows = destination
      ? await query("SELECT * FROM guides WHERE status='verified' AND place=$1 ORDER BY rating DESC,name", [destination])
      : await query("SELECT * FROM guides WHERE status='verified' ORDER BY rating DESC,name");
    let guides = rows.map(publicGuide);
    if (language) guides = guides.filter((g) => (g.languages || []).some((x) => language === String(x).toLowerCase()));
    return json({ guides });
  }
  if (path === "/api/plans") {
    const user = await requireUser(request, ["traveler"]);
    const plans = await query("SELECT id,user_id,destination,days,budget,interests,plan_json,created_at FROM plans WHERE user_id=$1 ORDER BY id DESC", [user.id]);
    return json({ plans: plans.map((p) => ({ ...p, plan: p.plan_json })) });
  }
  if (path === "/api/expenses") {
    const user = await requireUser(request, ["traveler"]);
    const planId = Number(url.searchParams.get("plan_id") || 0);
    const plans = await query("SELECT id,budget,destination FROM plans WHERE id=$1 AND user_id=$2", [planId, user.id]);
    if (!plans.length) throw new HttpError(400, "Choose a saved itinerary first.");
    const expenses = await query("SELECT * FROM expenses WHERE plan_id=$1 ORDER BY spent_on DESC,id DESC", [planId]);
    return json({ expenses, plan: plans[0], total: expenses.reduce((sum, x) => sum + Number(x.amount), 0) });
  }
  if (path === "/api/bookings") {
    const user = await requireUser(request);
    let rows;
    if (user.role === "traveler") {
      rows = await query("SELECT b.*,g.name AS guide_name,g.place,g.languages,EXISTS(SELECT 1 FROM reviews r WHERE r.booking_id=b.id) AS reviewed FROM bookings b JOIN guides g ON b.guide_id=g.id WHERE b.traveler_id=$1 ORDER BY b.trip_date DESC,b.id DESC", [user.id]);
    } else if (user.role === "guide") {
      rows = await query("SELECT b.*,u.name AS traveler_name,g.name AS guide_name,g.place,EXISTS(SELECT 1 FROM reviews r WHERE r.booking_id=b.id) AS reviewed FROM bookings b JOIN guides g ON b.guide_id=g.id JOIN users u ON b.traveler_id=u.id WHERE g.user_id=$1 ORDER BY b.trip_date,b.id DESC", [user.id]);
    } else {
      rows = await query("SELECT b.*,u.name AS traveler_name,g.name AS guide_name,g.place,EXISTS(SELECT 1 FROM reviews r WHERE r.booking_id=b.id) AS reviewed FROM bookings b JOIN guides g ON b.guide_id=g.id JOIN users u ON b.traveler_id=u.id ORDER BY b.trip_date DESC,b.id DESC LIMIT 100");
    }
    return json({ bookings: rows.map((b) => ({ ...b, reviewed: Boolean(b.reviewed) })) });
  }
  if (path === "/api/guide/profile") {
    const user = await requireUser(request, ["guide"]);
    const rows = await query("SELECT * FROM guides WHERE user_id=$1 ORDER BY id DESC LIMIT 1", [user.id]);
    return json({ guide: publicGuide(rows[0]) });
  }
  if (path === "/api/admin/guide-applications") {
    await requireUser(request, ["admin"]);
    const applications = await query("SELECT * FROM guides WHERE status='pending' ORDER BY created_at");
    return json({ applications: applications.map(publicGuide) });
  }
  if (path === "/api/admin/metrics") {
    await requireUser(request, ["admin"]);
    const [guides, pending, bookings, volume] = await Promise.all([
      query("SELECT COUNT(*)::int AS total FROM guides WHERE status='verified'"),
      query("SELECT COUNT(*)::int AS total FROM guides WHERE status='pending'"),
      query("SELECT COUNT(*)::int AS total FROM bookings"),
      query("SELECT COALESCE(SUM(amount),0)::int AS total FROM bookings WHERE payment_status='demo_paid'")
    ]);
    return json({ metrics: { guides: guides[0].total, pending: pending[0].total, bookings: bookings[0].total, volume: volume[0].total } });
  }
  return json({ error: "Not found." }, 404);
}

async function handlePost(request, path) {
  const body = await requestBody(request);
  if (path === "/api/auth/login") {
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const users = await query("SELECT * FROM users WHERE email=$1", [email]);
    if (!users.length || !(await passwordMatches(password, users[0].password_hash))) {
      throw new HttpError(401, "Email or password is incorrect.");
    }
    const user = users[0];
    const token = randomBytes(32).toString("base64url");
    const expires = new Date(Date.now() + 14 * 86400000).toISOString();
    await query("INSERT INTO sessions(token,user_id,expires_at) VALUES($1,$2,$3)", [token, user.id, expires]);
    return json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } }, 200, { "Set-Cookie": sessionCookie(token, 1209600) });
  }
  if (path === "/api/auth/signup") {
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const role = String(body.role || "traveler");
    if (name.length < 2 || name.length > 80 || !email.includes("@") || email.length > 180 || password.length < 8) {
      throw new HttpError(400, "Enter your name, a valid email and a password with at least 8 characters.");
    }
    if (!["traveler", "guide"].includes(role)) throw new HttpError(400, "Choose a traveller or local guide account.");
    const hashed = await passwordHash(password);
    const users = await query("INSERT INTO users(name,email,password_hash,role,created_at) VALUES($1,$2,$3,$4,$5) RETURNING id,name,email,role", [name, email, hashed, role, now()]);
    const user = users[0];
    const token = randomBytes(32).toString("base64url");
    const expires = new Date(Date.now() + 14 * 86400000).toISOString();
    await query("INSERT INTO sessions(token,user_id,expires_at) VALUES($1,$2,$3)", [token, user.id, expires]);
    return json({ user }, 201, { "Set-Cookie": sessionCookie(token, 1209600) });
  }
  if (path === "/api/auth/logout") {
    const token = getCookie(request, COOKIE);
    if (token) await query("DELETE FROM sessions WHERE token=$1", [token]);
    return json({ ok: true }, 200, { "Set-Cookie": sessionCookie("", 0) });
  }
  if (path === "/api/plans") {
    const user = await requireUser(request, ["traveler"]);
    const plan = makePlan(body);
    const rows = await query(
      "INSERT INTO plans(user_id,destination,days,budget,interests,plan_json,created_at) VALUES($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7) RETURNING id",
      [user.id, plan.destination, plan.days, plan.budget, JSON.stringify(plan.interests), JSON.stringify(plan), now()]
    );
    plan.id = rows[0].id;
    return json({ plan }, 201);
  }
  if (path === "/api/expenses") {
    const user = await requireUser(request, ["traveler"]);
    const planId = Number(body.plan_id || 0);
    const title = String(body.title || "").trim().slice(0, 100);
    const category = String(body.category || "Other").slice(0, 40);
    const amount = Number(body.amount || 0);
    const spentOn = String(body.spent_on || new Date().toISOString().slice(0, 10));
    if (!title || !Number.isInteger(amount) || amount < 1 || amount > 2000000) throw new HttpError(400, "Enter an expense name and an amount above ₹0.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(spentOn) || Number.isNaN(Date.parse(spentOn))) throw new HttpError(400, "Enter a valid expense date.");
    const plans = await query("SELECT id FROM plans WHERE id=$1 AND user_id=$2", [planId, user.id]);
    if (!plans.length) throw new HttpError(400, "Itinerary not found.");
    const rows = await query("INSERT INTO expenses(user_id,plan_id,title,category,amount,spent_on,created_at) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id", [user.id, planId, title, category, amount, spentOn, now()]);
    return json({ expense: { id: rows[0].id, plan_id: planId, title, category, amount, spent_on: spentOn } }, 201);
  }
  if (path === "/api/bookings") {
    const user = await requireUser(request, ["traveler"]);
    const guideId = Number(body.guide_id || 0);
    const guides = await query("SELECT * FROM guides WHERE id=$1 AND status='verified'", [guideId]);
    if (!guides.length) throw new HttpError(400, "This guide is not available for booking.");
    const tripDate = String(body.trip_date || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(tripDate) || Number.isNaN(Date.parse(tripDate))) throw new HttpError(400, "Choose a valid trip date.");
    if (tripDate < new Date().toISOString().slice(0, 10)) throw new HttpError(400, "Choose a future trip date.");
    const guests = clamp(Math.trunc(Number(body.guests || 1)), 1, 20);
    const note = String(body.note || "").trim().slice(0, 500);
    const rows = await query("INSERT INTO bookings(traveler_id,guide_id,destination,trip_date,guests,note,amount,status,payment_status,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,'pending','unpaid',$8) RETURNING id", [user.id, guideId, guides[0].place, tripDate, guests, note, guides[0].rate, now()]);
    return json({ booking_id: rows[0].id, message: "Request sent. The guide will confirm availability." }, 201);
  }
  const actionMatch = path.match(/^\/api\/bookings\/(\d+)\/action$/);
  if (actionMatch) {
    const user = await requireUser(request);
    const bookingId = Number(actionMatch[1]);
    const rows = await query("SELECT b.*,g.user_id AS guide_user_id FROM bookings b JOIN guides g ON g.id=b.guide_id WHERE b.id=$1", [bookingId]);
    if (!rows.length) throw new HttpError(400, "Booking not found.");
    const booking = rows[0];
    const action = String(body.action || "");
    let status = "";
    if (user.role === "guide" && booking.guide_user_id === user.id && booking.status === "pending" && ["confirm", "decline"].includes(action)) {
      status = action === "confirm" ? "confirmed" : "declined";
    } else if (user.role === "guide" && booking.guide_user_id === user.id && booking.status === "confirmed" && booking.payment_status === "demo_paid" && action === "complete") {
      status = "completed";
    } else if (user.role === "traveler" && booking.traveler_id === user.id && ["pending", "confirmed"].includes(booking.status) && action === "cancel") {
      status = "cancelled";
    } else {
      throw new HttpError(403, "That booking action is not available.");
    }
    if (status === "cancelled" && booking.payment_status === "demo_paid") {
      await query("UPDATE bookings SET status=$1,payment_status='refunded' WHERE id=$2", [status, bookingId]);
    } else {
      await query("UPDATE bookings SET status=$1 WHERE id=$2", [status, bookingId]);
    }
    return json({ ok: true, status });
  }
  const payMatch = path.match(/^\/api\/bookings\/(\d+)\/pay$/);
  if (payMatch) {
    const user = await requireUser(request, ["traveler"]);
    const bookingId = Number(payMatch[1]);
    const rows = await query("SELECT * FROM bookings WHERE id=$1 AND traveler_id=$2", [bookingId, user.id]);
    if (!rows.length || rows[0].status !== "confirmed") throw new HttpError(400, "Only confirmed bookings can be paid.");
    if (rows[0].payment_status !== "unpaid") throw new HttpError(400, "This booking is already paid.");
    await query("UPDATE bookings SET payment_status='demo_paid' WHERE id=$1", [bookingId]);
    return json({ ok: true, payment_status: "demo_paid", message: "Demo payment recorded. No money was charged." });
  }
  if (path === "/api/reviews") {
    const user = await requireUser(request, ["traveler"]);
    const bookingId = Number(body.booking_id || 0);
    const rating = Number(body.rating || 5);
    const comment = String(body.comment || "").trim().slice(0, 600);
    const rows = await query("SELECT * FROM bookings WHERE id=$1 AND traveler_id=$2 AND status='completed' AND payment_status='demo_paid'", [bookingId, user.id]);
    if (!rows.length || !Number.isInteger(rating) || rating < 1 || rating > 5) throw new HttpError(400, "A review is available after a completed trip.");
    const booking = rows[0];
    await query("INSERT INTO reviews(booking_id,traveler_id,guide_id,rating,comment,created_at) VALUES($1,$2,$3,$4,$5,$6)", [bookingId, user.id, booking.guide_id, rating, comment, now()]);
    const stats = await query("SELECT rating,reviews FROM guides WHERE id=$1", [booking.guide_id]);
    const count = Number(stats[0].reviews) + 1;
    const newRating = Math.round((Number(stats[0].rating) * Number(stats[0].reviews) + rating) / count * 10) / 10;
    await query("UPDATE guides SET rating=$1,reviews=$2 WHERE id=$3", [newRating, count, booking.guide_id]);
    return json({ ok: true }, 201);
  }
  if (path === "/api/guide/apply") {
    const user = await requireUser(request, ["guide"]);
    const place = String(body.place || "");
    let languages = body.languages || [];
    if (typeof languages === "string") languages = languages.split(",").map((x) => x.trim()).filter(Boolean);
    if (!Array.isArray(languages)) languages = [];
    languages = languages.slice(0, 8).map((x) => String(x).slice(0, 32));
    const rate = Number(body.rate || 0);
    const years = Number(body.years || 0);
    const bio = String(body.bio || "").trim().slice(0, 600);
    const specialty = String(body.specialty || "").trim().slice(0, 100);
    if (!DESTINATIONS[place]) throw new HttpError(400, "Choose a listed destination.");
    if (!Number.isInteger(rate) || !Number.isInteger(years) || rate < 500 || rate > 100000 || years < 0 || years > 60 || bio.length < 20 || !languages.length) {
      throw new HttpError(400, "Add a fair day rate, at least one language and a short introduction of 20+ characters.");
    }
    const existing = await query("SELECT id FROM guides WHERE user_id=$1 AND status IN ('pending','verified')", [user.id]);
    if (existing.length) throw new HttpError(400, "Your guide profile is already submitted or active.");
    const rows = await query("INSERT INTO guides(user_id,name,place,languages,rate,years,specialty,bio,status,created_at) VALUES($1,$2,$3,$4::jsonb,$5,$6,$7,$8,'pending',$9) RETURNING id", [user.id, user.name, place, JSON.stringify(languages), rate, years, specialty, bio, now()]);
    return json({ guide_id: rows[0].id, status: "pending" }, 201);
  }
  const decisionMatch = path.match(/^\/api\/admin\/guides\/(\d+)\/decision$/);
  if (decisionMatch) {
    await requireUser(request, ["admin"]);
    const action = String(body.action || "");
    if (!["approve", "reject"].includes(action)) throw new HttpError(400, "Choose approve or reject.");
    const status = action === "approve" ? "verified" : "rejected";
    const rows = await query("UPDATE guides SET status=$1 WHERE id=$2 AND status='pending' RETURNING id", [status, Number(decisionMatch[1])]);
    if (!rows.length) throw new HttpError(400, "Pending application not found.");
    return json({ ok: true, status });
  }
  return json({ error: "Not found." }, 404);
}

export default async function handler(request) {
  const url = new URL(request.url);
  const path = decodeURIComponent(url.pathname);
  if (path === "/api/health" && request.method === "GET") {
    return json({ ok: true, product: "DESTINEX", mode: "public" });
  }
  try {
    await ensureAdmin();
    if (request.method === "GET") return await handleGet(request, path, url);
    if (request.method === "POST") return await handlePost(request, path);
    return json({ error: "Method not allowed." }, 405);
  } catch (error) {
    if (error instanceof HttpError) return json({ error: error.message }, error.status);
    if (error && error.code === "23505") {
      const message = path === "/api/reviews" ? "A review has already been submitted for this trip." : "That email is already registered.";
      return json({ error: message }, 400);
    }
    const errorId = createHash("sha256").update(String(error?.name || "Error") + ":" + String(error?.code || "")).digest("hex").slice(0, 10);
    console.error("DESTINEX API error", errorId);
    return json({ error: "A server error occurred. Please try again.", reference: errorId }, 500);
  }
}

export const config = {
  path: [
    "/api/health", "/api/bootstrap", "/api/guides", "/api/plans", "/api/expenses", "/api/bookings",
    "/api/bookings/:bookingId/action", "/api/bookings/:bookingId/pay",
    "/api/auth/login", "/api/auth/signup", "/api/auth/logout", "/api/reviews",
    "/api/guide/profile", "/api/guide/apply", "/api/admin/guide-applications", "/api/admin/metrics",
    "/api/admin/guides/:guideId/decision"
  ]
};
