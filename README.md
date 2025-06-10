# Style Studio AI

An AI-powered clothing visualization platform that allows e-commerce businesses to showcase their products on models or create lifestyle imagery using advanced AI technology.

## 🚀 Project Status

**Current Phase**: Phase 0 - Foundation ✅ **COMPLETED** (June 10, 2025)
**Next Phase**: Phase 1 - MVP Core Development 🔄 **READY TO BEGIN**

## 🛠 Technology Stack

- **Frontend**: Next.js 15 + TypeScript + Tailwind CSS v4 + shadcn/ui
- **Backend**: Next.js API Routes + Convex
- **Database**: Convex (BaaS with real-time capabilities)
- **AI**: Replicate API (Stable Diffusion)
- **Storage**: Cloudinary
- **Auth**: NextAuth.js
- **Payments**: Stripe
- **Hosting**: Vercel

## 📋 Development Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- Git

### Getting Started

1. **Clone and install dependencies:**

```bash
git clone <repository-url>
cd style-studio-ai
npm install
```

2. **Set up environment variables:**

```bash
cp .env.example .env.local
# Fill in your API keys and configuration
```

3. **Start the development server:**

```bash
npm run dev
```

4. **Open your browser:**
   Visit [http://localhost:3000](http://localhost:3000)

## 🏗 Project Structure

```
src/
├── app/                 # Next.js App Router
│   ├── (auth)/         # Auth route group
│   ├── dashboard/      # Dashboard pages
│   ├── generate/       # Generation interface
│   └── api/           # API routes
├── components/         # Reusable components
│   ├── ui/            # Basic UI components (shadcn/ui)
│   ├── forms/         # Form components
│   ├── layout/        # Layout components
│   └── custom/        # Custom business components
├── lib/               # Utilities and configurations
├── hooks/             # Custom React hooks
├── types/             # TypeScript type definitions
└── styles/            # Global styles
```

## 🧑‍💻 Development Workflow

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run type-check` - Run TypeScript checks
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

### VS Code Integration

This project is fully configured for VS Code with:

- ✅ Essential extensions recommendations
- ✅ Debugging configurations
- ✅ Development tasks
- ✅ GitHub Copilot automation rules
- ✅ Code formatting and linting on save

### Code Quality

- **TypeScript**: Strict mode enabled with custom path mapping
- **ESLint**: Configured with Next.js and TypeScript rules
- **Prettier**: Code formatting with Tailwind CSS plugin
- **Husky**: Pre-commit hooks for code quality
- **lint-staged**: Staged files linting

## 📚 Documentation

- [Development Roadmap](./docs/development-roadmap.md) - Detailed development phases and progress
- [Product Plan](./docs/product-plan.md) - Product vision and business requirements
- [Setup Summary](./SETUP_SUMMARY.md) - Phase 0 completion summary

## 🎯 Key Features (Planned)

### MVP Features

- User authentication and management
- Image upload and processing
- AI-powered clothing visualization
- Real-time generation status
- Basic subscription plans
- Payment processing

### Advanced Features

- Multiple AI model options
- Batch processing capabilities
- E-commerce platform integrations
- Advanced image editing tools
- Analytics and reporting
- API access for developers

## 🔄 Current Development Status

### ✅ Completed (Phase 0)

- [x] Next.js 15 project with TypeScript
- [x] shadcn/ui components integration
- [x] Development tools setup (ESLint, Prettier, Husky)
- [x] Essential dependencies installation
- [x] VS Code workspace configuration
- [x] Git repository with commit hooks
- [x] Project structure and architecture

### 🔄 Next Steps (Phase 1)

- [ ] Convex backend setup and database schema
- [ ] NextAuth.js authentication system
- [ ] Core UI components and layouts
- [ ] Image upload and management system
- [ ] Replicate AI integration
- [ ] Stripe payment system

## 🤝 Contributing

This project follows a structured development roadmap. Please refer to the [Development Roadmap](./docs/development-roadmap.md) for current priorities and task assignments.

## 📄 License

[Add your license information here]

---

**Built with ❤️ using Next.js 15, TypeScript, and AI technology**
