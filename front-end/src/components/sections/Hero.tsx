import { Button } from "@/components/ui/button"
import { Container } from "@/components/layout/Container"
import { ArrowRight, Play } from "lucide-react"
import heroImage from "@/assets/hero-shoes-1.jpg"

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-background via-background to-muted/20">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-hero opacity-5" />
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
      
      <Container className="relative z-10">
        <div className="grid lg:grid-cols-2 items-center gap-12 min-h-[80vh]">
          {/* Left Content */}
          <div className="space-y-8 text-center lg:text-left">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 bg-muted/50 rounded-full px-4 py-2 text-sm font-medium">
                <span className="w-2 h-2 bg-secondary rounded-full animate-pulse" />
                New Collection 2024
              </div>
              
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight">
                <span className="gradient-text">Passion</span>
                <br />
                <span className="text-foreground">Every Step</span>
              </h1>
              
              <p className="text-xl text-muted-foreground max-w-2xl leading-relaxed">
                Discover our family footwear collection with modern designs, 
                premium quality, and cutting-edge technology.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button variant="hero" size="lg" className="group" asChild>
                <a href="/products">
                Explore Now
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </a>
              </Button>
              
              <Button variant="glass" size="lg" className="group">
                <Play className="mr-2 h-5 w-5" />
                Watch Video
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 pt-8 border-t border-border/50">
              <div className="text-center lg:text-left">
                <div className="text-2xl font-bold gradient-text">10K+</div>
                <div className="text-sm text-muted-foreground">Happy Customers</div>
              </div>
              <div className="text-center lg:text-left">
                <div className="text-2xl font-bold gradient-text">500+</div>
                <div className="text-sm text-muted-foreground">Products</div>
              </div>
              <div className="text-center lg:text-left">
                <div className="text-2xl font-bold gradient-text">5⭐</div>
                <div className="text-sm text-muted-foreground">Rating</div>
              </div>
            </div>
          </div>

          {/* Right Image */}
          <div className="relative parallax-container">
            <div className="relative z-10 animate-float">
              <img
                src={heroImage}
                alt="Premium Athletic Shoes"
                className="w-full h-auto max-w-2xl mx-auto drop-shadow-2xl"
              />
            </div>
            
            {/* Floating Elements */}
            <div className="absolute top-10 right-10 w-20 h-20 bg-gradient-secondary rounded-2xl blur-xl opacity-50 animate-pulse" />
            <div className="absolute bottom-20 left-10 w-16 h-16 bg-gradient-primary rounded-full blur-lg opacity-40 animate-pulse" style={{ animationDelay: '0.5s' }} />
          </div>
        </div>
      </Container>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-primary rounded-full flex flex-col items-center justify-start p-2">
          <div className="w-1 h-3 bg-primary rounded-full animate-pulse" />
        </div>
      </div>
    </section>
  )
}