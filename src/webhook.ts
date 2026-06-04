import { Request, Response } from "express";
import prisma from "./config/database";
import { updateOrderStatus } from "./modules/orders/order.service";

export const webhookGet = (req: Request, res: Response) => {
  console.log(req.query);

  const verifyToken = "byteforge_verify";

  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  // VERIFY WEBHOOK
  if (mode === "subscribe" && token === verifyToken) {
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
};

export const webhookPost = async (req: Request, res: Response) => {
  try {
    console.log(JSON.stringify(req.body, null, 2));

    const message =
      req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    // INTERACTIVE BUTTON REPLY
    if (message?.type === "interactive") {
      const buttonReply =
        message.interactive.button_reply.id;

      console.log("BUTTON CLICKED:", buttonReply);

      // CONFIRM ORDER
      if (buttonReply.startsWith("confirm_")) {
        const orderId = buttonReply.replace("confirm_", "");

        console.log("ORDER ID:", orderId);

        // UPDATE DATABASE
        await updateOrderStatus(orderId, "CONFIRMED");

        const updatedOrder = await prisma.order.findUnique({
          where: {
            id: orderId,
          },
        });

        console.log("UPDATED ORDER:", updatedOrder);

        console.log("CONFIRMED ORDER:", orderId);
      }

      // CANCEL ORDER
      if (buttonReply.startsWith("cancel_")) {
        const orderId = buttonReply.replace("cancel_", "");

        console.log("ORDER ID:", orderId);

        // UPDATE DATABASE
        await updateOrderStatus(orderId, "CANCELLED");

        const updatedOrder = await prisma.order.findUnique({
          where: {
            id: orderId,
          },
        });

        console.log("UPDATED ORDER:", updatedOrder);

        console.log("CANCELLED ORDER:", orderId);
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.log("WEBHOOK ERROR:", error);

    res.sendStatus(500);
  }
};