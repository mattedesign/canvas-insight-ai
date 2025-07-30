# UX Analysis AI Platform

A modern web application that leverages AI to provide comprehensive UX/UI analysis and insights for images and design compositions.

## 🚀 Features

- **AI-Powered Analysis**: Integration with Claude and OpenAI for intelligent UX/UI feedback
- **Image Upload & Management**: Drag-and-drop interface for uploading and organizing images
- **Interactive Canvas**: Visual workspace for arranging and analyzing design elements
- **Project Management**: Create, organize, and manage multiple analysis projects
- **Real-time Collaboration**: Live updates and collaborative analysis features
- **Subscription Management**: Integrated billing and subscription handling
- **Responsive Design**: Optimized for desktop and mobile devices

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS with custom design system
- **UI Components**: Radix UI primitives with shadcn/ui
- **Backend**: Supabase (Database, Auth, Storage, Edge Functions)
- **State Management**: React Context + useReducer
- **Routing**: React Router Dom
- **AI Integration**: OpenAI GPT & Claude via Supabase Edge Functions
- **File Upload**: React Dropzone
- **Charts**: Recharts for analytics
- **Notifications**: Sonner for toast messages

## 🚦 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account (for backend services)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd ux-analysis-platform
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Configure Supabase:
   - Create a new Supabase project
   - Update environment variables with your Supabase credentials
   - Run database migrations (if any)

5. Start the development server:
```bash
npm run dev
```

## 📜 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## 🏗️ Project Structure

```
src/
├── components/          # Reusable UI components
├── context/            # React Context providers
├── hooks/              # Custom React hooks
├── pages/              # Route components
├── services/           # Business logic and API services
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
└── integrations/       # External service integrations
```

## 🤖 AI Rules of Engagement

### General Guidelines

1. **Be Specific**: Provide clear, actionable feedback rather than vague suggestions
2. **Context Aware**: Consider the target audience and use case when analyzing designs
3. **Evidence-Based**: Support recommendations with UX principles and best practices
4. **Prioritized**: Focus on high-impact issues that affect user experience most
5. **Constructive**: Frame feedback positively with specific improvement suggestions

### Analysis Focus Areas

- **Usability**: Navigation, accessibility, and user flow
- **Visual Hierarchy**: Information organization and emphasis
- **Content Strategy**: Clarity, readability, and information architecture
- **Interaction Design**: User interface patterns and micro-interactions
- **Responsive Design**: Cross-device compatibility and mobile optimization

## 🔧 Development Guidelines

### Code Standards

- Use TypeScript for type safety
- Follow React best practices and hooks patterns
- Implement responsive design with Tailwind CSS
- Use semantic HTML and ensure accessibility
- Write self-documenting code with clear naming

### State Management

- Use React Context for global state
- Implement useReducer for complex state logic
- Keep state updates predictable and traceable
- Avoid prop drilling with proper context organization

### Performance

- Implement code splitting and lazy loading
- Optimize images and assets
- Use React.memo for expensive components
- Monitor bundle size and performance metrics

## 📝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review existing discussions

---

Built with ❤️ using React, TypeScript, and Supabase