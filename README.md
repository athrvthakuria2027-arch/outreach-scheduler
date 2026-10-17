# Outreach Scheduler

Warm-up email scheduler for freelancers and small sales teams. Demo mode: everything runs in the browser (localStorage), no backend or env vars.

## Core task (for the test note)
Sign up, add contacts (manually or by CSV upload with columns name,email,company), write an email template using {name} and {company}, and open the Schedule page.
Expected result: the app builds a warm-up send schedule - 10 emails on day 1, +5 more each day, random gaps between sends, Mon-Fri 9:00-17:00 only. The Dashboard shows queued, sent today, daily limit, bounces, replies and a sender health score out of 100. If bounce rate goes above 5% or health drops below 60 (click "Simulate a bad batch"), a red "Paused" banner appears.

## Run
npm install
npm run dev      # local
npm run build    # production build in dist/

## Deploy
Import the repo in Vercel (framework: Vite, defaults work). No environment variables needed.
