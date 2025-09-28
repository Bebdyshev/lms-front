import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { ArrowRight } from "lucide-react";

export function HowToStartSection() {
  const steps = [
    { step: "01", title: "Registration", description: "Create an account and choose your role: student, teacher or administrator" },
    { step: "02", title: "Profile Setup", description: "Fill in information about yourself and set up personal preferences" },
    { step: "03", title: "Course Selection", description: "Find courses of interest or create your own learning materials" },
    { step: "04", title: "Start Learning", description: "Begin studying materials and interacting with the community" },
  ];

  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-balance mb-6">How to Get Started</h2>
          <p className="text-lg text-muted-foreground text-balance leading-relaxed">
            Just four simple steps separate you from starting your learning journey on our platform
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {steps.map((step, index) => (
            <Card key={index} className="text-center hover:shadow-lg transition-shadow">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4 font-bold">
                  {step.step}
                </div>
                <CardTitle className="text-lg">{step.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <Button size="lg" className="text-base px-8">
            Start Right Now
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}

export default HowToStartSection;


