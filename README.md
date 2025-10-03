
# Contextual RAG Chatbot

A simple Retrieval-Augmented Generation (RAG) chatbot built with Next.js, TypeScript, MySQL, and Google Gemini. It answers user queries using your own documentation stored in a MySQL database.

## Features
- Modern chat UI (React + Tailwind CSS)
- Contextual answers using Gemini and MySQL
- Easy local development (XAMPP/MySQL)

## Setup
1. **Clone the repository**
2. **Install dependencies:**
	```bash
	npm install
	```
3. **Configure environment variables:**
	- Copy `.env.example` to `.env.local` and fill in your Gemini API key and MySQL credentials.
4. **Prepare the MySQL database:**
	- Create a database (default: `chatbot_context`).
	- Create a table `help_articles` with columns: `title`, `content`, `keywords`, `last_updated`.
	- Insert your documentation articles.
5. **Run the development server:**
	```bash
	npm run dev
	```
6. **Open** [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables
See `.env.example` for required variables:
- `GEMINI_API_KEY`
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_DATABASE`

## Usage
Type a question in the chat box. The bot will search your MySQL docs and answer using Gemini.

## Troubleshooting
- Ensure MySQL and Gemini API key are set up and running.
- Check `.env.local` for correct credentials.
- See browser/console logs for errors.

## License
MIT
