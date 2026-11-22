# Neutron

Neutron is a deterministic distributed-systems simulator with Firebase hybrid AI. See the [engineering specification](docs/00-README.md) for scope and milestones.

## Local setup

Use Node.js 22.12 or newer and npm.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` for verification.

## Firebase AI feasibility

1. In the Firebase console, create or select a project, enable Firebase AI Logic with the Gemini Developer API, and register a web app. Copy `.env.example` to `.env.local` and fill in the Firebase web app values. Use the Firebase web API key from the app configuration.
2. For the cloud test, register the web app for App Check with reCAPTCHA Enterprise and set `NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY` to the public score-based website key ID. Run `npm run dev` and open http://localhost:3000/ai-feasibility. Click **Send sample to cloud**, then register any generated localhost debug token shown in DevTools under App Check > Apps > Manage debug tokens. Retry after registration. Keep the debug token private.
3. On supported desktop Chrome, choose **Check local support** and then **Run local only**. If Chrome offers the model for download, let it finish online. Check that the response reports **Local** and the command passes validation.
4. Keep the page open, disconnect the network, switch the sample latency, and run locally again. Confirm that the new response reports **Local** and matches the new sample. Reconnect and verify the cloud response reports **Cloud** and passes validation. Compare the displayed inference timings after model setup.

See the [official Firebase web guide](https://firebase.google.com/docs/ai-logic/hybrid/web/get-started) for Chrome requirements and App Check setup.
