<h1 align="center">🚀 EloSystem</h1>

<p align="center">
  Plataforma completa de <strong>gestão de Recursos Humanos</strong> — do recrutamento à folha de pagamento —
  com foco em <strong>segurança empresarial</strong>, performance e experiência premium.
</p>

<p align="center">
  <a href="https://elo-rh-system.vercel.app/login"><img src="https://img.shields.io/badge/🌐_Acessar_demo-2563EB?style=for-the-badge" /></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/Prisma-2D3748?style=flat-square&logo=prisma&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" />
  <img src="https://img.shields.io/badge/Framer_Motion-0055FF?style=flat-square&logo=framer&logoColor=white" />
</p>

---

## 🧠 Sobre o projeto

O **EloSystem** é uma plataforma interna de RH que **centraliza processos, dados e decisões** em um único ambiente — cobrindo todo o ciclo do colaborador: **admissão, homologação, formulário de admissão, controle de ponto, documentação, controle de fardas e desligamento**.

Projetado com foco em:

- 🔐 **Segurança empresarial** (MFA, sessões, auditoria)
- ⚡ **Performance** e experiência moderna
- 📊 **Decisão baseada em dados**
- 🧩 **Arquitetura escalável**

## 🎯 Funcionalidades

| Área | O que cobre |
|---|---|
| 👥 **Administração** | Gestão de usuários, perfis e permissões, auditoria completa, integrações (Microsoft Graph · SharePoint · OneDrive) |
| 🧑‍💼 **Pessoas** | Colaboradores, pré-admissão, onboarding, benefícios, controle de fardas |
| 📂 **Compliance** | Documentos e arquivos, atestados, advertências, suspensões, afastamentos |
| ⏱️ **Jornada** | Folha de ponto, banco de horas, escala operacional |
| 💰 **Departamento Pessoal** | Folha de pagamento, holerites, eventos da folha |
| 📊 **Gestão** | Dashboard executivo, relatórios, treinamentos, desempenho, férias, calendário |

## 🧠 Destaques

- ✔ Integração **Jornada → Folha** automática
- ✔ **Avaliação de desempenho** com pesos configuráveis
- ✔ **Dashboard executivo** com insights
- ✔ Geração de **PDFs oficiais** com auditoria
- ✔ Integração com **storage corporativo** (SharePoint / OneDrive)
- ✔ **Controle de permissões por módulo** + auditoria centralizada

## 🔐 Segurança

- Autenticação com **MFA** (OTP por e-mail)
- Sessões **persistidas e revogáveis**
- Proteção contra **brute force**
- Política de **senha forte**
- **Auditoria** de ações críticas
- Controle de permissões por módulo

## ⚙️ Stack

**Backend:** Node.js · Express · Prisma ORM · PostgreSQL
**Frontend:** React · Vite · TailwindCSS · Framer Motion

## 📦 Estrutura

```
/backend      # API (Node + Express + Prisma)
  /src
  /tests
/frontend     # SPA (React + Vite)
  /src
  /tests
```

## 🚀 Como rodar

```bash
# Backend
cd backend && npm install && npm run dev      # http://localhost:3000

# Frontend
cd frontend && npm install && npm run dev     # http://localhost:5173
```

Banco: PostgreSQL (`localhost:5432` / `rh_system`).

## 🧪 Testes

```bash
npm test              # backend / frontend (unitários)
npx playwright test   # E2E
```

## 📈 Status

✔ Funcional para uso interno · ✔ Fluxos críticos validados · ✔ Segurança implementada · ✔ Pronto para **Go-Live controlado**

## 🧩 Roadmap

- [ ] Tema Dark / Blue Premium
- [ ] MFA com TOTP (app Authenticator)
- [ ] E2E completo com dados reais
- [ ] Otimização avançada de bundle
- [ ] Painel administrativo de sessões

---

**Autor:** Gabriel de Macêdo Trisi · Plataforma interna de gestão de RH com potencial de evolução para **produto SaaS**.

<i>⚡ Menos burocracia, mais decisão baseada em dados.</i>

<sub>© 2026 Gabriel Trisi — Todos os direitos reservados. Código público apenas para avaliação (portfólio); uso, cópia ou redistribuição não autorizados. Ver <a href="./COPYRIGHT">COPYRIGHT</a>.</sub>
