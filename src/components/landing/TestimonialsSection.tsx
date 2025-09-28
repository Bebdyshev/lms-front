import { Card, CardContent } from "../ui/card";
import { Star, Quote } from "lucide-react";

export function TestimonialsSection() {
  const testimonials = [
    {
      name: "Bekzhan Yerlanov",
      role: "MasterSAT Student",
      content: "Master Education helped me achieve my dream score of 1520 on the SAT. The structured approach and expert guidance made all the difference.",
      rating: 5,
      avatar: "SJ"
    },
    {
      name: "Ruslan Zainullin",
      role: "MasterIELTS Student",
      content: "I got 8.5 on IELTS thanks to the comprehensive preparation materials and personalized feedback from my instructors.",
      rating: 5,
      avatar: "AR"
    },
    {
      name: "Rakhat Zhanibekov",
      role: "MasterAdmissions Student",
      content: "The platform's analytics helped me track my progress and identify areas for improvement. Now I'm at my dream university!",
      rating: 5,
      avatar: "MG"
    },
    {
      name: "Shyngys Baurzhanov",
      role: "Parent",
      content: "As a parent, I'm impressed by the transparency and detailed progress reports. My daughter's confidence has grown tremendously.",
      rating: 5,
      avatar: "DC"
    },
    {
      name: "Rustem Zhumashev",
      role: "Teacher",
      content: "The teaching tools are intuitive and powerful. I can create engaging content and track student progress effectively.",
      rating: 5,
      avatar: "ER"
    },
    {
      name: "Ruslan Zainullin",
      role: "MasterSAT Teacher",
      content: "The platform's scalability and security features give us confidence in managing our growing student body.",
      rating: 5,
      avatar: "JW"
    }
  ];

  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-balance mb-6">What Our Community Says</h2>
          <p className="text-lg text-muted-foreground text-balance leading-relaxed">
            Real stories from students, teachers, and parents who've achieved their goals with Master Education
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                
                <Quote className="h-6 w-6 text-primary/20 mb-4" />
                
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                  "{testimonial.content}"
                </p>
                
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-sm font-semibold text-primary">{testimonial.avatar}</span>
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{testimonial.name}</div>
                    <div className="text-xs text-muted-foreground">{testimonial.role}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

export default TestimonialsSection;
