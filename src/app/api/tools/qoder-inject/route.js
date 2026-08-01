import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function POST(request) {
  try {
    const body = await request.json();
    const { pat } = body;

    if (!pat || typeof pat !== "string") {
      return NextResponse.json(
        { success: false, error: "PAT is required" },
        { status: 400 }
      );
    }

    // Sanitize input - only allow alphanumeric and special characters for tokens
    if (!/^[\w\-\.]+$/.test(pat)) {
      return NextResponse.json(
        { success: false, error: "Invalid PAT format" },
        { status: 400 }
      );
    }

    const cliPath = `${process.cwd()}/src/cli.js`;
    const command = `node ${cliPath} auto --pat ${JSON.stringify(pat)}`;

    console.log("Running Qoder inject command:", command);

    let output = "";
    let stderr = "";

    try {
      const { stdout, stderr: cmdStderr } = await execAsync(command, {
        timeout: 60000, // 60 second timeout
        env: process.env,
      });

      output = stdout || cmdStderr || "Command executed successfully";

      return NextResponse.json({
        success: true,
        message: "Qoder injection completed",
        output,
      });
    } catch (error) {
      stderr = error.stderr || error.message;
      console.error("Qoder inject error:", stderr);

      return NextResponse.json(
        {
          success: false,
          error: "Failed to inject Qoder",
          output: stderr,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Qoder inject API error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
