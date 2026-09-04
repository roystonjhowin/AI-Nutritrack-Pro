<div align="center">

<img src="logo.png" alt="NutriTrack Pro logo" width="120">

# NutriTrack Pro

**A simple, smart nutrition tracker for anyone — not just gym-goers.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Made with JavaScript](https://img.shields.io/badge/Made%20with-JavaScript-f7df1e)](https://github.com/roystondcunha28-cyber/Nutritrack-Pro)
[![Live Demo](https://img.shields.io/badge/Live-Demo-brightgreen)](https://bodycraftpre-beige.vercel.app)

[Live Demo](https://bodycraftpre-beige.vercel.app) · [Report a Bug](../../issues) · [Request a Feature](../../issues)

</div>

---

## About

**NutriTrack Pro** is a web app that helps everyday people understand and manage what they eat — whether the goal is weight loss, weight gain, managing a health condition, or just building better everyday habits. It's built for anyone who wants a clearer picture of their nutrition, not just athletes or gym-goers.

The app combines everyday food tracking with an AI-powered assistant to make logging meals and getting nutrition guidance quick and effortless.

## Features

- 🍽️ **Food & meal tracking** — log what you eat throughout the day
- 🤖 **AI-powered assistance** — get smart, personalized nutrition suggestions
- 📊 **Simple, clean interface** — no clutter, easy for anyone to use
- 🌐 **Works in the browser** — no installation needed
- ⚡ **Fast and lightweight** — built with a minimal, efficient stack

> Have a feature to add or correct here? Feel free to edit this section to match the app as it evolves.

## Tech Stack

| Layer      | Technology                     |
|------------|---------------------------------|
| Frontend   | HTML, CSS, JavaScript          |
| Backend    | Node.js, Express (`server.js`) |
| AI Layer   | `ai.js` (AI-assisted features) |
| Deployment | [Vercel](https://vercel.com)   |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later recommended)
- npm (comes with Node.js)

### Installation

```bash
# Clone the repository
git clone https://github.com/roystondcunha28-cyber/Nutritrack-Pro.git
cd Nutritrack-Pro

# Install dependencies
npm install
```

### Environment Variables

If the app uses any API keys (for example, for the AI features in `ai.js`), create a `.env` file in the root directory:

```env
# Example — replace with the variables your app actually uses
API_KEY=your_api_key_here
PORT=3000
```

> ⚠️ Never commit your `.env` file — it's already excluded via `.gitignore`.

### Running Locally

```bash
node server.js
```

Then open `http://localhost:3000` (or whichever port is configured) in your browser.

## Deployment

This project is deployed on **Vercel**. To deploy your own copy:

1. Fork this repository
2. Import the project into [Vercel](https://vercel.com/new)
3. Add any required environment variables in the Vercel project settings
4. Deploy 🚀

## Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the project
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for more information.

## Author

**Royston Jhowin Dcunha**

- GitHub: [@roystondcunha28-cyber](https://github.com/roystondcunha28-cyber)

---

<div align="center">
Made with care, for anyone trying to eat a little better. 🥗
</div>
