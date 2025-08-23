# /telegram-bot/bot.py

import os
import logging
from dotenv import load_dotenv
from telegram import Update
from telegram.ext import (
    ApplicationBuilder,
    CommandHandler,
    MessageHandler,
    ContextTypes,
    filters
)

# Enable logging for debugging
logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s", level=logging.INFO
)
logger = logging.getLogger(__name__)

# Load environment variables from .env file
load_dotenv()
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")

if not BOT_TOKEN:
    logger.error("❌ TELEGRAM_BOT_TOKEN is missing in your .env file.")
    exit(1)


# Command: /start
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Send a welcome message when the /start command is issued."""
    await update.message.reply_text(
        "👋 Hello! I’m your TravelAi Telegram bot.\n"
        "Type /help to see what I can do."
    )


# Command: /help
async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Send a list of commands."""
    await update.message.reply_text(
        "/start - Start the bot\n"
        "/help - Show this help message\n"
        "Just send me any text and I’ll echo it back!"
    )


# Message handler: Echo back any text
async def echo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Echo the user message."""
    await update.message.reply_text(update.message.text)


async def main():
    """Run the Telegram bot."""
    application = ApplicationBuilder().token(BOT_TOKEN).build()

    # Command handlers
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("help", help_command))

    # Message handler (non-command)
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, echo))

    logger.info("🚀 Bot is running...")
    await application.run_polling()


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
