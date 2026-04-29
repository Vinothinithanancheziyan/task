import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "default-secret";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    const { data: admin, error } = await supabaseAdmin
      .from("system_admins")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (error || !admin) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = jwt.sign(
      { email: admin.email, role: "admin" },
      JWT_SECRET,
      { expiresIn: "8h" }
    );

    const response = NextResponse.json({ 
      message: "Login successful", 
      admin: { email: admin.email } 
    });

    response.cookies.set("admin_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 8 * 60 * 60, // 8 hours
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("Admin login error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
