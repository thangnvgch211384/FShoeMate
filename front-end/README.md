# ShoeFam - Family Shoe Store Website

A premium, modern React + TypeScript website for a family shoe store with Nike-inspired design, featuring vibrant colors, smooth animations, and complete e-commerce functionality.

## 🚀 Features

### Design System
- **Modern Color Palette**: Electric blue primary, vibrant orange secondary with full HSL support
- **Typography**: Poppins font family with proper weights and letter spacing
- **Animations**: Smooth transitions, hover effects, parallax, and stagger animations
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Premium Components**: Glass morphism effects, gradient buttons, and advanced shadows

### Core Functionality
- **Hero Section**: Parallax effects with floating elements and animated statistics
- **Product Catalog**: Grid/list view with advanced filtering by category, brand, price
- **Product Cards**: Hover image swap, quick add to cart, wishlist functionality
- **Product Details**: Image gallery, size/color selection, quantity picker
- **Mega Menu Navigation**: Sticky navbar with animated dropdown menus
- **Chatbot**: Floating AI assistant with quick responses
- **SEO Optimized**: Proper meta tags, structured data ready

### Pages Implemented
- **Homepage** (`/`): Hero, featured products, categories
- **Products** (`/products`): Complete product catalog with filters
- **Product Detail** (`/products/:id`): Full product information and purchase options
- **404 Page**: Stylized error page with navigation options

### Technical Stack
- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS with custom design tokens
- **UI Components**: Radix UI primitives with custom variants
- **Routing**: React Router v6 with lazy loading ready
- **State Management**: Ready for Context API or external state management
- **Animation**: CSS animations with configurable timing functions

## 🎨 Design System

### Color Tokens
```css
/* Primary Colors */
--primary: 217 91% 60%           /* Electric Blue */
--primary-glow: 217 91% 70%      /* Lighter Blue */
--primary-dark: 217 91% 45%      /* Darker Blue */

/* Secondary Colors */ 
--secondary: 25 95% 60%          /* Vibrant Orange */
--secondary-glow: 25 95% 70%     /* Lighter Orange */
--secondary-dark: 25 95% 45%     /* Darker Orange */

/* Gradients */
--gradient-hero: linear-gradient(135deg, hsl(217 91% 60%), hsl(25 95% 60%))
--gradient-primary: linear-gradient(135deg, hsl(217 91% 60%), hsl(217 91% 70%))
--gradient-glass: linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))
```

### Animation System
- **Fade In Up**: Staggered content reveal animations
- **Scale In**: Product card hover effects
- **Float**: Floating elements in hero section
- **Pulse Glow**: Interactive button effects
- **Shimmer**: Loading state animations

### Button Variants
- `hero`: Gradient with glow effects
- `secondary`: Orange gradient
- `glass`: Glassmorphism effect
- `outline`: Border with hover fill
- `premium`: Enhanced gradient with borders

## 📁 Project Structure

```
src/
├── components/
│   ├── ui/                      # Base UI components (shadcn/ui)
│   │   ├── button.tsx           # Enhanced button with premium variants
│   │   ├── badge.tsx            # Status badges
│   │   └── ...                  # Other UI primitives
│   ├── layout/                  # Layout components
│   │   ├── Container.tsx        # Responsive container
│   │   ├── Navbar.tsx           # Sticky navigation with mega menu
│   │   └── Footer.tsx           # Site footer with newsletter
│   ├── sections/                # Page sections
│   │   ├── Hero.tsx             # Parallax hero section
│   │   ├── FeaturedProducts.tsx # Product showcase
│   │   └── Categories.tsx       # Category grid
│   ├── product/                 # Product-related components
│   │   └── ProductCard.tsx      # Interactive product cards
│   └── chatbot/                 # AI assistant
│       └── ChatbotButton.tsx    # Floating chat interface
├── pages/                       # Route components
│   ├── Index.tsx                # Homepage
│   ├── Products.tsx             # Product catalog
│   ├── ProductDetail.tsx        # Individual product page
│   └── NotFound.tsx             # 404 error page
├── data/                        # Mock data
│   └── products.ts              # Product catalog data
├── assets/                      # Images and media
│   ├── hero-shoes-1.jpg         # Hero section image
│   ├── product-shoe-1.jpg       # Product images
│   └── ...
└── lib/                         # Utilities
    └── utils.ts                 # Helper functions
```

## 🛠 Installation & Setup

1. **Clone the repository**
   ```bash
   git clone <YOUR_GIT_URL>
   cd <YOUR_PROJECT_NAME>
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Build for production**
   ```bash
   npm run build
   ```

## 🎯 Key Components Usage

### ProductCard
```tsx
<ProductCard
  id="1"
  name="Air Max Pro Runner"
  price={2490000}
  originalPrice={3200000}
  image="/product-1.jpg"
  hoverImage="/product-1-alt.jpg"
  rating={4.8}
  reviewCount={124}
  isNew={true}
  isOnSale={true}
/>
```

### Button Variants
```tsx
<Button variant="hero" size="lg">Primary CTA</Button>
<Button variant="glass" size="lg">Glass Effect</Button>
<Button variant="premium" size="xl">Premium Action</Button>
```

### Hero Section Features
- Parallax scrolling effects
- Floating background elements
- Animated statistics counters
- Responsive design with breakpoints

## 🚀 Future Enhancements

### Planned Features (30+ pages total)
- **E-commerce**: Cart, Checkout, Payment integration
- **User Account**: Login, Registration, Profile, Order history
- **Advanced Features**: Wishlist, Reviews system
- **Admin Dashboard**: Product management, Analytics, Customer management
- **Additional Pages**: About, Contact, Blog, Size guide

### Technical Improvements
- **Backend Integration**: Ready for Supabase/Firebase integration
- **Performance**: Image optimization, lazy loading, code splitting
- **PWA**: Service worker, offline support, app-like experience
- **Analytics**: User behavior tracking, conversion optimization
- **Internationalization**: Multi-language support

## 📱 Responsive Design

- **Mobile First**: Optimized for mobile devices
- **Breakpoints**: sm (640px), md (768px), lg (1024px), xl (1280px)
- **Touch Interactions**: Mobile-friendly hover states
- **Performance**: Optimized images and animations

## 🔧 Customization

### Colors
Update color tokens in `src/index.css` and `tailwind.config.ts` to match your brand.

### Typography
Modify font families in the design system - currently using Poppins.

### Animations
Adjust animation timing and effects in the CSS custom properties.

### Components
All components are built with customization in mind using the Class Variance Authority (CVA) pattern.

## 📄 License

This project is built with Lovable and includes modern web development best practices for e-commerce applications.

---

**Built with ❤️ using React, TypeScript, Tailwind CSS, and modern web technologies.**