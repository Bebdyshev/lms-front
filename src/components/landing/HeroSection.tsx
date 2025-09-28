import { ArrowRight, Play } from "lucide-react";
import { Button } from "../ui/button";
import LogoIcon from '../../assets/masteredlogo-ico.ico';

export function HeroSection() {
  return (
    <section className="relative pt-24 pb-20 lg:pt-32 lg:pb-32 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />

      <div className="container mx-auto px-4 relative">
        <div className="max-w-4xl mx-auto text-center mt-32">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-8">
            <img src={LogoIcon} alt="Master Education" className="h-6 w-6 object-contain" />
            Modern Educational Platform
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-balance mb-6">
            Complete Platform for <span className="text-primary">Online Learning</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground text-balance mb-10 max-w-2xl mx-auto leading-relaxed">
            Master Education is a modern LMS system for creating, managing and conducting online courses. Securely
            create, deploy and scale the best educational solutions.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Button size="lg" className="text-base px-8">
              Start Learning
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button variant="outline" size="lg" className="text-base px-8 bg-transparent">
              <Play className="mr-2 h-4 w-4" />
              Watch Demo
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-12 border-t border-border">
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-primary mb-2">1000+</div>
              <div className="text-sm text-muted-foreground">Active Students</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-primary mb-2">50+</div>
              <div className="text-sm text-muted-foreground">Teachers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-primary mb-2">200+</div>
              <div className="text-sm text-muted-foreground">Courses</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-primary mb-2">95%</div>
              <div className="text-sm text-muted-foreground">Satisfaction</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default HeroSection;


