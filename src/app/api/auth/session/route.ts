import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { connectDb } from "@/lib/db";
import { UserModel } from "@/models/User";
export async function GET() {
    const session = await getSessionFromCookies();
    if (!session) {
        return NextResponse.json({ user: null }, { status: 401 });
    }
    await connectDb();
    const user = await UserModel.findById(session.sub).lean();
    if (!user) {
        return NextResponse.json({ user: null }, { status: 401 });
    }
    return NextResponse.json({
        user: {
            id: user._id,
            name: user.name,
            username: user.username,
            role: user.role,
        },
    });
}
