# /telegram-bot/webhook.py

import os
import logging
from dotenv import load_dotenv
from flask import Flask, request
from telegram import Update
from telegram.ext import ApplicationBuilder, CommandHandler, MessageHandler, ContextTypes, filters

# Load environment variables
load_dotenv()
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
WEBHOOK_URL = os.getenv("WEBHOOK_URL")  # Example: https://yourdomain.com/webhook

# Logging setup
logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s", level=logging.INFO
)
logger = logging.getLogger(__name__)

if not BOT_TOKEN:
    logger.error("❌ TELEGRAM_BOT_TOKEN is missing in your .env file.")
    exit(1)

if not WEBHOOK_URL:
    logger.error("❌ WEBHOOK_URL is missing in your .env file.")
    exit(1)

# Flask app
app = Flask(__name__)

# Telegram bot application
application = ApplicationBuilder().token(BOT_TOKEN).build()


# Commands
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("👋 Hello! I’m your TravelAi Telegram bot.\nType /help to see commands.")


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("/start - Start bot\n/help - Show help\nSend any message to get an echo.")


# Echo non-command messages
async def echo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(update.message.text)


# Register handlers
application.add_handler(CommandHandler("start", start))
application.add_handler(CommandHandler("help", help_command))
application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, echo))


@app.route("/webhook", methods=["POST"])
def webhook():
    """Receive updates from Telegram and pass them to the bot."""
    try:
        update = Update.de_json(request.get_json(force=True), application.bot)
        application.update_queue.put_nowait(update)
    except Exception as e:
        logger.error(f"Webhook handling error: {e}")
    return "OK", 200


@app.route("/set_webhook", methods=["GET"])
def set_webhook():
    """Set the Telegram webhook."""
    success = application.bot.set_webhook(f"{WEBHOOK_URL}/webhook")
    return f"Webhook set: {success}", 200


if __name__ == "__main__":
    # Run Flask app
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))
# Webhook for bot
