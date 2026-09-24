---
title: College Basketball Manager
theme: cayman
paginate: true
---



# **College Basketball Manager**
### John Azzara — CS461 Senior Seminar  
### Hanover College — 2026–2027

---

# **Introduction**
## What I Built & Why It Matters

- A **College Basketball Manager** simulation game inspired by *Football Manager*  
- Lets players run a full college basketball program  
- Focuses on recruiting, player development, staff management, and season progression  
- Built to explore sports analytics, simulation design, and web app architecture

---

# **Motivation**
## Why Build a College Basketball Manager?

- No major game exists that captures the **unique ecosystem** of college basketball  
- Recruiting battles, NIL, transfer portal, and academic eligibility create rich strategy  
- College hoops has passionate fans but limited management‑sim representation  
- I wanted to build something that blends **data**, **strategy**, and **simulation**

---

# **Project Overview**
## What the Application Does

- Manage a fictional college basketball program  
- Recruit high school prospects with varying attributes  
- Handle transfer portal decisions  
- Develop players over multiple seasons  
- Set lineups, rotations, and play styles  
- Compete in conference play and March Madness  
- Track team performance across years

---

# **Core Features**
## What Users Can Do

- View roster, player ratings, and development  
- Recruit prospects based on interest, ratings, and competition  
- Manage scholarships and roster limits  
- Navigate NIL incentives and transfer portal  
- Simulate games and seasons  
- Build a long‑term program identity

---

# **Technologies Used**
## The Tools Behind the Project

- **Frontend:** React  
- **Backend:** Express / Node  
- **Build Tools:** Vite  
- **Deployment:** GitHub Pages  
- **Data:** JSON‑based player and team models  
- **Version Control:** GitHub

---

# **Why These Technologies?**
## Clear Justification (A‑Level Requirement)

### React  
- Component‑based UI fits roster, player cards, and tables  
- Fast rendering for dynamic data  
- Alternatives considered: Vue, Svelte

### Express  
- Simple API endpoints for teams, players, and simulations  
- Easy to expand into more complex logic  
- Alternatives considered: Django, Flask

### Vite  
- Extremely fast dev environment  
- Great for React projects  
- Alternatives considered: Webpack

### GitHub Pages  
- Free hosting  
- Automatic deployment  
- Alternatives considered: Netlify, Vercel

---

# **Architecture Overview**
## How the System Fits Together

- **React Frontend**  
  - Roster view  
  - Recruiting dashboard  
  - Player development screens  
  - Season simulation UI  

- **Express Backend**  
  - Player generation  
  - Recruiting logic  
  - Game simulation engine  
  - Team progression  

- **Data Flow**  
  - Frontend requests → Backend simulation → Updated state returned  
  - Stored in JSON models for simplicity

---

# **Related Work**
## What Exists & How This Compares

- **Football Manager**  
  - Deep simulation, but focused on professional soccer  
- **College Hoops 2K8 (legacy)**  
  - Limited management depth, outdated  
- **Mobile GM games**  
  - Shallow recruiting and development systems  

**My project adds:**  
- Modern recruiting mechanics  
- Transfer portal logic  
- NIL incentives  
- Academic eligibility  
- Multi‑season progression  
- Web‑based accessibility

---

# **Challenges & Solutions**
## What I Overcame

- Designing realistic recruiting logic  
- Balancing player development curves  
- Creating meaningful
