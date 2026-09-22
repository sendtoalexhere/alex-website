/* =====================================================================
   CONTENT: this is the only file you need to edit for text.

   The world is a set of ARCHIPELAGOS. Each one is a lagoon: its islands sit on a
   ring around `centre`, with their jetties facing the middle. The side facing Home
   is left open so you can sail in.

   archipelago: id, title, colour, centre [x, z], radius (ring size), sweep (degrees of ring used)
   island:      id, title, landmark, html, and optionally
                style  { size, shape ('hill'|'plateau'|'crag'|'peaks'|'pontoon'), height, sand, mound, rock,
                         plants ('palms'|'pines'|'snowpines'|'none'), plantCount, rocks, landmarkScale }
                angle  degrees round the ring, 0 = the far side from Home (overrides automatic spacing)
                entrance  distance from the centre towards Home (used for the sports pontoon)
                at     [dx, dz] offset from the archipelago centre (used for the API island next to Home)
                dock   false = scenery only: no jetty, no panel, not counted in the logbook
                style.turn  degrees to rotate the whole island clockwise (landmark, jetty and dock ring)

   ===================================================================== */

export const SITE = {
  name: 'Alexander Tolstyakov',
  role: 'Founder · Growth & Product',
  tagline: 'Founder of Karteto, working across product and growth, and a sailor. This is my CV, except you sail it: work, education, places I\'ve lived, and things I do for fun.',
  email: 'sendtoalexhere (at) gmail.com',   // deliberately written without the @, so scrapers don't pick it up
  linkedin: 'https://www.linkedin.com/in/alex-tols',
  appStore: 'https://apps.apple.com/us/app/karteto-vocabulary-flashcards/id6450647717',
  googlePlay: 'https://play.google.com/store/apps/details?id=com.karteto.application',
};

export const ARCHIPELAGOS = [
  {
    id: 'home', title: 'Home', colour: '#e4572e', centre: [0, 0], radius: 0,
    islands: [{
      id: 'about', title: 'About me', landmark: 'lighthouse', style: { size: 22 },
      html: `
        <p><strong>Alexander Tolstyakov</strong>. Founder of Karteto, working across product and growth. Based in Dubai.</p>
        <p>I took a consumer subscription app, <strong>Karteto</strong>, from an idea to 200K+ downloads, 5K+ paying subscribers and $300K+ in annual recurring revenue, owning product, growth and the P&amp;L end to end. Before that I led partnerships at C-level in fintech, after commercial and financial analytics roles at Exante, Coca-Cola HBC and Nissan.</p>
        <p>I like combining hands-on product and performance-marketing work with a finance-grade grip on unit economics. I'm now looking to bring a founder's ownership to building and scaling products inside a larger organisation.</p>
        <p>Write to me at <strong class="addr">sendtoalexhere (at) gmail.com</strong> · <a href="https://www.linkedin.com/in/alex-tols" target="_blank" rel="noopener">LinkedIn</a></p>
        <p><em>Four archipelagos to explore: Work is straight downwind. Follow a line of coloured buoys, or press <kbd>M</kbd> for the chart. The little island next door explains how to make use of me.</em></p>`,
    }, {
      id: 'api', title: 'API me', landmark: 'terminal', at: [-64, -36],
      style: { size: 13, shape: 'plateau', height: 1, sand: 0xd9dee3, mound: 0x1f2a36, plants: 'none', rocks: 3, rock: 0x5f6a72 },
      html: `
        <p>Think of me as a service with three well-documented endpoints. No key needed, responses usually within a day.</p>
        <pre><code>GET /alex/apps</code></pre>
        <p><strong>Apps: product and advertising.</strong> I built and scaled a subscription app to 200K+ downloads, so I can help with 0-to-1 product decisions, onboarding and paywalls, subscription pricing, paid user acquisition, creatives, ROAS and unit economics.</p>
        <pre><code>POST /alex/analysis</code></pre>
        <p><strong>Business analysis.</strong> Send a messy question and some data. You get back funnels, budgets, bonus schemes, pricing and elasticity, market sizing, and a recommendation someone at C-level can act on.</p>
        <pre><code>GET /alex/immigration?from=&amp;to=</code></pre>
        <p><strong>Immigration systems.</strong> I've lived in seven places and navigated plenty of visa, residency and company set-up rules along the way. Happy to share how the systems actually work.</p>
        <pre><code>{ "status": 200, "auth": "none", "rate_limit": "be reasonable",
  "contact": "sendtoalexhere (at) gmail.com" }</code></pre>
        <p>Send a request to <strong class="addr">sendtoalexhere (at) gmail.com</strong> · <a href="https://www.linkedin.com/in/alex-tols" target="_blank" rel="noopener">LinkedIn</a></p>`,
    }],
  },

  {
    id: 'work', title: 'Work & Projects', colour: '#f2b84b', centre: [62, 215], radius: 92,
    islands: [
      {
        id: 'karteto', title: 'Karteto', landmark: 'phone', angle: 138,
        style: { size: 21, shape: 'plateau', height: 1.4, sand: 0xfdf6d3, mound: 0x2743d6, plants: 'palms', plantCount: 5, rocks: 3, rock: 0xe8e2d6, landmarkScale: 1.3, turn: 20 },
        html: `
          <p><strong>Founder</strong> · Mar 2023 – present · iOS &amp; Android</p>
          <p>Karteto is a vocabulary flashcard app for 100+ languages. It builds personalised decks with AI, schedules reviews with spaced repetition, and adds native-speaker audio, short audio stories, a word map and shared public decks. 4.3★ on the App Store.</p>
          <p><a class="store-btn" href="https://apps.apple.com/us/app/karteto-vocabulary-flashcards/id6450647717" target="_blank" rel="noopener">Download on the App Store</a> <a class="store-btn" href="https://play.google.com/store/apps/details?id=com.karteto.application" target="_blank" rel="noopener">Get it on Google Play</a></p>
          <div class="shots">
            <img src="assets/karteto-1.jpg" alt="Karteto practice screen with a map of your words" loading="lazy">
            <img src="assets/karteto-2.jpg" alt="A flashcard: por favor, with an illustration and example sentence" loading="lazy">
            <img src="assets/karteto-4.jpg" alt="Pair matching exercise" loading="lazy">
            <img src="assets/karteto-7.jpg" alt="An AI-generated audio story using your words" loading="lazy">
            <img src="assets/karteto-5.jpg" alt="Explore: catalogue of ready-made decks" loading="lazy">
            <img src="assets/karteto-6.jpg" alt="Vocab builder: pick terms to learn" loading="lazy">
            <img src="assets/karteto-8.jpg" alt="The Animals deck" loading="lazy">
            <img src="assets/karteto-3.jpg" alt="A flashcard: agua" loading="lazy">
          </div>
          <ul>
            <li><strong>0-to-1 product</strong>: from concept to App Store and Google Play launch, owning strategy, roadmap and delivery.</li>
            <li><strong>Growth engine</strong>: built paid acquisition from scratch and scaled spend at a profitable ROAS to 200K+ downloads.</li>
            <li><strong>Monetisation</strong>: 5K+ paying subscribers and $300K+ in annual recurring revenue.</li>
            <li><strong>AI automation</strong>: marketing automated with n8n workflows and generative-AI tools such as fal.ai.</li>
            <li><strong>Company building</strong>: legal entity, hiring, negotiations, marketing and project management.</li>
          </ul>
          <p><em>Sail through the floating cards around the island to collect some words.</em></p>`,
      },
      {
        id: 'fintech', title: 'Fintech', landmark: 'tower', angle: -72,
        style: { size: 16, shape: 'crag', sand: 0xc9c2b2, mound: 0x7f8a91, plants: 'none', rocks: 8, rock: 0x5f6a72 },
        html: `
          <p><strong>Head of Partnerships, Rock-West</strong> · digital brokerage · C-level role · Jul 2024 – Mar 2025</p>
          <ul>
            <li>Owned the partnerships roadmap and budget, driving deposit volume, partner acquisition and profit share.</li>
            <li>Worked with trading, sales and support teams to scale partnership products, aligning technical delivery with commercial KPIs.</li>
            <li>Optimised partner commission structures to balance acquisition incentives with profitability.</li>
          </ul>
          <p><strong>Senior Business Analyst, Exante</strong> · prime brokerage · Oct 2020 – Mar 2023</p>
          <ul>
            <li>Promoted in Jan 2022 to manage the business analysis unit, informing decisions at C-level.</li>
            <li>Improved the client funnel, adjusted the sales bonus system, introduced rolling budgeting and oversaw hiring control.</li>
            <li>Reported to the Head of Global Sales; contributed to strategic planning, process design and competitor analysis.</li>
          </ul>`,
      },
      {
        id: 'corporate', title: 'Corporate', landmark: 'factory', angle: 72,
        style: { size: 17, shape: 'plateau', height: 1, sand: 0xe6d6a8, mound: 0x9aa7ad, plants: 'pines', plantCount: 5, rocks: 5 },
        html: `
          <figure><img src="assets/photos/coca-cola.jpg" alt="Alex in a lab coat and hi-vis vest next to a giant Coca-Cola bottle" loading="lazy"><figcaption>At a Coca-Cola HBC plant</figcaption></figure>
          <p><strong>Senior Financial Analyst, Coca-Cola HBC</strong> · FMCG · Apr – Aug 2019</p>
          <ul>
            <li>Analysed sales results for the top-revenue key accounts, over 50% of company revenue.</li>
            <li>Controlled customer OPEX, ran business-plan and rolling budgets, updated commercial policy and trading terms.</li>
          </ul>
          <figure><img src="assets/photos/nissan-plant.jpg" alt="Alex in a hi-vis vest on the production line under a Nissan St Petersburg plant banner" loading="lazy"><figcaption>On the line at the Nissan plant in St Petersburg</figcaption></figure>
          <p><strong>Graduate Analyst, Nissan Manufacturing</strong> · automotive · Aug 2017 – Mar 2019</p>
          <ul>
            <li>Project-managed the launch of a peer-to-peer sales and marketing programme: website, call centre, legal, financials.</li>
            <li>As a junior product manager: pricing, elasticity analysis, market reports, and Nissan's car-sharing strategy.</li>
            <li>Variance and profitability analysis, annual budgeting, control of marketing spend and incentives.</li>
          </ul>
          <p><strong>Early career</strong> · 2013 – 2015: internships at Platts (McGraw Hill Financial), Sberbank and Otkritie Securities.</p>`,
      },
      {
        id: 'skills', title: 'Skills', landmark: 'toolbox', angle: 0,
        style: { size: 13, shape: 'hill', mound: 0x6fbf73, plants: 'palms', plantCount: 3, rocks: 4 },
        html: `
          <p><strong>Growth</strong>: paid user acquisition, unit economics, funnel analysis, variance analysis, subscription monetisation, partnerships.</p>
          <p><strong>Product</strong>: 0-to-1 launches, roadmapping, pricing, cross-functional delivery, budgeting and C-level reporting.</p>
          <p><strong>Tools</strong>: Excel, SQL, Ads Manager, Figma, Miro, Jira, Confluence, n8n, fal.ai and other generative-AI tools.</p>
          <p><strong>Languages</strong>: English (fluent), Russian (native), Spanish (basic, working on it with Karteto).</p>`,
      },
    ],
  },

  {
    id: 'education', title: 'Education', colour: '#3a86d4', centre: [-215, 60], radius: 78, sweep: 200,
    islands: [
      {
        id: 'lse', title: 'LSE', landmark: 'university',
        style: { size: 17, shape: 'plateau', height: 1.2, mound: 0x6fae6a, plants: 'none', rocks: 4 },
        html: `
          <figure><img src="assets/photos/lse-graduation.jpg" alt="Alex in graduation gown outside LSE" loading="lazy"><figcaption>Graduation day, London</figcaption></figure>
          <p><strong>London School of Economics and Political Science</strong></p>
          <p>BSc Management · 2012 – 2015 · Upper Second Class Honours (2:1)</p>
          <p>Vice President of the LSE Rus Business Society: organised speaker events with well-known business leaders and sponsors.</p>`,
      },
      {
        id: 'esade', title: 'ESADE', landmark: 'modern',
        style: { size: 17, shape: 'plateau', height: 1.2, sand: 0xf6e3b0, mound: 0xd9c27a, plants: 'palms', plantCount: 5, rocks: 3 },
        html: `
          <figure><img src="assets/photos/esade-graduation.jpg" alt="Alex on stage in a blue ESADE graduation sash" loading="lazy"><figcaption>ESADE graduation, Barcelona</figcaption></figure>
          <p><strong>ESADE Business School</strong>, Barcelona</p>
          <p>MSc Finance · 2015 – 2016 · Distinction (7.5)</p>`,
      },
      {
        id: 'dulwich', title: 'Dulwich College', landmark: 'school',
        style: { size: 13, shape: 'hill', plants: 'pines', plantCount: 4, rocks: 4 },
        html: `
          <p><strong>Dulwich College</strong>, London · 2008 – 2012</p>
          <p>A-levels: Russian A*, Economics A, Mathematics A, History B.</p>`,
      },
    ],
  },

  {
    id: 'places', title: 'Places I\'ve lived', colour: '#2aa79b', centre: [240, 10], radius: 96, sweep: 292,
    islands: [
      { id: 'akademgorodok', title: 'Akademgorodok', landmark: 'akadem',
        style: { size: 11, shape: 'hill', sand: 0xe9eef2, mound: 0xffffff, plants: 'snowpines', plantCount: 6, rocks: 2, rock: 0xdfe6ea },
        html: `<p>The science town in the Siberian forest outside Novosibirsk. This is where I was born.</p>` },
      { id: 'moscow', title: 'Moscow', landmark: 'moscow',
        style: { size: 11, shape: 'plateau', height: .8, mound: 0x8e9aa0, plants: 'pines', plantCount: 3, rocks: 2 },
        html: `<p>The mummy still lies there.</p>` },
      { id: 'london', title: 'London', landmark: 'london',
        style: { size: 11, shape: 'plateau', height: .8, mound: 0x6fae6a, plants: 'none', rocks: 2 },
        html: `<p>London is the capital of Great Britain 😉</p>` },
      { id: 'barcelona', title: 'Barcelona', landmark: 'barcelona',
        style: { size: 11, shape: 'plateau', height: .8, sand: 0xf6e3b0, mound: 0xe2c58a, plants: 'palms', plantCount: 3, rocks: 2 },
        html: `<p>It could be the best city in the world, a European Silicon Valley, but it urgently needs better governance.</p>` },
      { id: 'split', title: 'Split', landmark: 'split',
        style: { size: 11, shape: 'hill', sand: 0xefe6d2, mound: 0x8fb58a, plants: 'pines', plantCount: 3, rocks: 5, rock: 0xd8d2c4 },
        html: `<p>The cosiest place, with the friendliest people.</p>` },
      { id: 'telaviv', title: 'Tel Aviv', landmark: 'telaviv',
        style: { size: 11, shape: 'plateau', height: .6, sand: 0xf8e8bb, mound: 0xf1dfa8, plants: 'palms', plantCount: 4, rocks: 1 },
        html: `<p>The most unusual and contradictory city I've been in.</p>` },
      { id: 'dubai', title: 'Dubai', landmark: 'dubai',
        style: { size: 12, shape: 'plateau', height: .6, sand: 0xf3d9a0, mound: 0xe9cf95, plants: 'palms', plantCount: 4, rocks: 1 },
        html: `<p>Home base today.</p>` },
    ],
  },

  {
    id: 'fun', title: 'Things I like', colour: '#9b5de5', centre: [-70, -235], radius: 120, sweep: 290,
    islands: [
      { id: 'library', title: 'Books & resources', landmark: 'library',
        style: { size: 19, shape: 'plateau', height: 1.2, mound: 0x6fae6a, plants: 'palms', plantCount: 5, rocks: 3, landmarkScale: 1.45 },
        html: `
          <p>There are many interesting books out there. These are the ones that have had the biggest impact on me.</p>
          <ul class="books">
            <li><strong>The Titan</strong>, Theodore Dreiser. A ruthless financier builds a streetcar empire in Gilded Age Chicago. A novel about ambition, capital and what they cost.</li>
            <li><strong>The Gene: An Intimate History</strong>, Siddhartha Mukherjee. The story of genetics from Mendel's peas to CRISPR, woven together with the author's own family history.</li>
            <li><strong>Human Errors</strong>, Nathan H. Lents. A tour of the design flaws in the human body, from pointless bones to broken genes, and what they reveal about evolution.</li>
            <li><strong>The Call of the Wild</strong>, Jack London. A pampered dog is stolen and sold into the Klondike gold rush, and finds out what he is made of.</li>
            <li><strong>The Beermat Entrepreneur</strong>, Mike Southon and Chris West. How to take an idea sketched on a beermat to a real company: the people you need and the stages you go through.</li>
            <li><strong>Start-up Nation</strong>, Dan Senor and Saul Singer. Why a small country with few resources and many enemies produces so many start-ups.</li>
            <li><strong>Mythos</strong>, Stephen Fry. The Greek myths retold with wit and warmth, from the birth of the gods to the first humans.</li>
            <li><strong>The Black Swan</strong>, Nassim Nicholas Taleb. Rare, unpredictable events shape history far more than we admit, and we keep pretending we saw them coming.</li>
            <li><strong>Dune</strong>, Frank Herbert. Politics, ecology, religion and power on a desert planet. Still the benchmark for science fiction.</li>
            <li><strong>Солнечное вещество (Solar Matter)</strong>, Матвей Бронштейн. A popular-science classic that reads like a detective story: how helium was found on the Sun before anyone found it on Earth.</li>
            <li><strong>Деловые записки</strong>, Пётр Капица. A Nobel physicist's working notes and letters on how to organise science, run an institute and stand your ground.</li>
            <li><strong>Principles</strong>, Ray Dalio. Dalio's rulebook for decisions, work and radical transparency. Best read together with <em>The Fund</em> by Rob Copeland, a reporter's account of how those principles played out inside Bridgewater.</li>
            <li><strong>Elon Musk</strong>, Walter Isaacson. A close-up biography written from two years of shadowing him: the drive, the risk appetite and the damage.</li>
            <li><strong>Дневники</strong>, Лев Толстой. Diaries kept for more than sixty years: a great writer's relentless, unflattering examination of himself.</li>
            <li><strong>Actionable Gamification</strong>, Yu-kai Chou. The Octalysis framework: eight core drives behind human motivation, and how to design products around them.</li>
            <li><strong>Learned Optimism</strong>, Martin Seligman. How the way you explain setbacks to yourself shapes your resilience, and how to change it.</li>
            <li><strong>Империя должна умереть</strong>, Михаил Зыгарь. Russia from 1900 to 1917, told through the people who lived it: how an empire walked into revolution.</li>
            <li><strong>The 4-Hour Workweek</strong>, Tim Ferriss. Question the default career script: automate, delegate, and design work around the life you actually want.</li>
          </ul>
          <p><strong>Podcasts and channels</strong></p>
          <ul>
            <li><a href="https://www.youtube.com/@Alexander_Gelman" target="_blank" rel="noopener">Александр Гельман. Радостные шахматы</a>: chess, explained with joy (in Russian).</li>
            <li><a href="https://www.youtube.com/@Foureyes.Furniture" target="_blank" rel="noopener">Foureyes Furniture</a>: modern furniture design and woodworking.</li>
            <li><a href="https://www.youtube.com/@TwoMinutePapers" target="_blank" rel="noopener">Two Minute Papers</a>: the latest AI and graphics research in a few minutes.</li>
            <li><a href="https://www.youtube.com/@nateherk" target="_blank" rel="noopener">Nate Herk</a>: practical AI automation and n8n workflows.</li>
            <li><a href="https://www.youtube.com/@MyFirstMillionPod" target="_blank" rel="noopener">My First Million</a>: business ideas, trends and founder stories.</li>
            <li><a href="https://www.youtube.com/@3blue1brown" target="_blank" rel="noopener">3Blue1Brown</a>: maths made visual.</li>
            <li><a href="https://www.youtube.com/@smartereveryday" target="_blank" rel="noopener">SmarterEveryDay</a>: curiosity-driven science and engineering.</li>
            <li><a href="https://www.youtube.com/@JayAndMark" target="_blank" rel="noopener">Jay and Mark</a></li>
          </ul>` },
      { id: 'sailing', title: 'Sailing', landmark: 'marina',
        style: { size: 14, shape: 'hill', plants: 'palms', plantCount: 4, rocks: 3 },
        html: `<figure><img src="assets/photos/sailing.jpg" alt="Alex at the helm of a yacht in a captain hat" loading="lazy"><figcaption>At the helm</figcaption></figure><p>I hold a sailing licence, which is why this website is a boat.</p>` },
      { id: 'ski', title: 'Skiing', landmark: 'ski', dock: false,
        style: { size: 12, shape: 'hill', sand: 0xe9eef2, mound: 0xffffff, plants: 'snowpines', plantCount: 5, rocks: 2, rock: 0xcfd8dd } },
      { id: 'rink', title: 'Ice hockey', landmark: 'rink', dock: false,
        style: { size: 13, shape: 'plateau', height: .5, sand: 0xe9eef2, mound: 0xffffff, plants: 'snowpines', plantCount: 3, rocks: 1, rock: 0xdfe6ea } },
      { id: 'crafts', title: 'Crafts', landmark: 'crafts',
        style: { size: 17, shape: 'plateau', height: .8, mound: 0x8fb58a, plants: 'pines', plantCount: 5, rocks: 3 },
        html: `
          <p>I like making things with my hands, and with machines that do it for me: 3D printing, drones, woodworking, and cooking.</p>
          <div class="photos">
            <figure><video src="assets/photos/kinetic-shark.mp4" poster="assets/photos/kinetic-shark.jpg" muted loop playsinline controls preload="none" aria-label="A kinetic sculpture: a blue 3D-printed dolphin that swims above a wooden frame"></video><figcaption>Kinetic dolphin, 3D-printed</figcaption></figure>
            <figure><img src="assets/photos/wood-table.jpg" alt="A round wooden table on hairpin legs" loading="lazy"><figcaption>A table I built from scratch</figcaption></figure>
            <figure><img src="assets/photos/3d-printer.jpg" alt="A large frame 3D printer on a workshop bench" loading="lazy"><figcaption>The printer, in the workshop</figcaption></figure>
            <figure><video src="assets/photos/infinity-mirror.mp4" poster="assets/photos/infinity-mirror.jpg" muted loop playsinline controls preload="none" aria-label="A round infinity mirror with a tunnel of LED lights"></video><figcaption>Infinity mirror</figcaption></figure>
          </div>
          <ul>
            <li><strong>3D printing</strong>: a small project of mine, the kinetic dolphin in the video above.</li>
            <li><strong>Drones</strong>: my first salary went on parts for a build-it-yourself drone, back before you could simply buy a DJI.</li>
            <li><strong>Woodworking and carpentry</strong>: I've built some furniture from scratch, and would love to do more when I have the time and the space for it.</li>
          </ul>` },
      { id: 'chessboard', title: 'Chess', landmark: 'chess', dock: false,
        style: { size: 11, shape: 'plateau', height: .6, mound: 0x6fae6a, plants: 'none', rocks: 2 } },
      { id: 'boulder', title: 'Bouldering', landmark: 'boulder', dock: false,
        style: { size: 11, shape: 'hill', mound: 0xb9ad98, sand: 0xe6d6a8, plants: 'pines', plantCount: 3, rocks: 5, rock: 0x9a8f7c } },
      { id: 'tenniscourt', title: 'Tennis', landmark: 'tennis', dock: false,
        style: { size: 12, shape: 'plateau', height: .5, mound: 0xc96a3a, plants: 'palms', plantCount: 2, rocks: 1 } },
      { id: 'pitch', title: 'Football', landmark: 'pitch', dock: false,
        style: { size: 13, shape: 'plateau', height: .6, mound: 0x4caf50, plants: 'none', rocks: 2 } },
      { id: 'sports', title: 'Sports club', landmark: 'clubhouse', entrance: 66,
        style: { size: 6, shape: 'pontoon' },
        html: `
          <p>Sport is where I get my energy, and most of this lagoon is a playground.</p>
          <div class="photos">
            <figure><img src="assets/photos/squash.jpg" alt="Alex lunging for a ball on a squash court" loading="lazy"><figcaption>Squash</figcaption></figure>
            <figure><img src="assets/photos/ice-hockey.jpg" alt="An ice hockey team in purple and blue jerseys after a game" loading="lazy"><figcaption>Ice hockey, London</figcaption></figure>
            <figure><img src="assets/photos/nissan-football.jpg" alt="Six players in red Nissan football shirts on a snowy pitch" loading="lazy"><figcaption>Winter football with the Nissan team</figcaption></figure>
            <figure><img src="assets/photos/skiing.jpg" alt="Alex on skis beside a blue ice cave" loading="lazy"><figcaption>Skiing</figcaption></figure>
          </div>
          <p>One dock, several games:</p>
          <ul>
            <li><strong>Squash</strong>: the floating court behind you. Press <kbd>Space</kbd> to serve, hit the glowing target, volley rebounds with your hull for double points. 45 seconds.</li>
            <li><strong>Football</strong>: nudge the ball into the floating goal by the pitch.</li>
            <li><strong>Ice hockey</strong>: the puck slides a long way. Put it in the net by the rink.</li>
            <li><strong>Tennis</strong>: knock a ball across the floating net for an ace.</li>
            <li><strong>Chess</strong>: giant pieces are adrift by the board. Tip the king.</li>
            <li><strong>Bouldering and skiing</strong>: no game, just a wall and a mountain I'd rather be on.</li>
          </ul>` },
    ],
  },
];

// Floating flashcards around the Karteto island (words from the real app decks). Sail through one to flip it.
export const CARDS = [
  { front: 'por favor', back: 'please', lang: 'phrase' },
  { front: 'agua', back: 'water', lang: 'noun' },
  { front: 'mirar', back: 'to look', lang: 'verb' },
  { front: 'amigo', back: 'friend', lang: 'noun' },
  { front: 'perro', back: 'dog', lang: 'noun' },
  { front: 'playa', back: 'beach', lang: 'noun' },
  { front: 'mesa', back: 'table', lang: 'noun' },
  { front: 'ruiseñor', back: 'nightingale', lang: 'noun' },
];
