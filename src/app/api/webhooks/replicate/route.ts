import { NextRequest, NextResponse } from "next/server";
import { ReplicateWebhookEvent } from "@/types/generation";
import { GenerationService } from "@/services/generation";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get("webhook-signature");
    if (!signature) {
      return NextResponse.json(
        { error: "Missing webhook signature" },
        { status: 400 }
      );
    }

    const body = await request.text();
    const webhookSecret = process.env.REPLICATE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("REPLICATE_WEBHOOK_SECRET not configured");
      return NextResponse.json(
        { error: "Webhook not configured" },
        { status: 500 }
      );
    }

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(body)
      .digest("hex");

    const providedSignature = signature.replace("sha256=", "");

    if (
      !crypto.timingSafeEqual(
        Buffer.from(expectedSignature, "hex"),
        Buffer.from(providedSignature, "hex")
      )
    ) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Parse webhook payload
    const webhookData: ReplicateWebhookEvent = JSON.parse(body);

    // Process the webhook
    const generationService = new GenerationService();
    await generationService.handleWebhook(webhookData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook processing failed:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
