import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Video, FileText, MessageCircle, Calendar, TrendingUp, Users2, Settings, Award } from "lucide-react";

export function FeaturesSection() {
  const features = [
    { icon: Video, title: "Video Lessons", description: "High-quality videos with interactive elements" },
    { icon: FileText, title: "Assignments & Tests", description: "Automatic checking and detailed feedback" },
    { icon: MessageCircle, title: "Chat with Teachers", description: "Instant communication and real-time support" },
    { icon: Calendar, title: "Event Calendar", description: "Schedule classes and important deadlines" },
    { icon: TrendingUp, title: "Progress Tracking", description: "Visualize achievements and areas for improvement" },
    { icon: Users2, title: "Group Management", description: "Organize students and collaborative work" },
    { icon: Settings, title: "Course Builder", description: "Easy creation and editing of learning materials" },
    { icon: Award, title: "Grading System", description: "Flexible assessment and certification system" },
  ];

  return (
    <section id="features" className="py-20">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-balance mb-6">Platform Features</h2>
          <p className="text-lg text-muted-foreground text-balance leading-relaxed">
            All the tools needed for effective online learning, gathered in one convenient platform.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

export default FeaturesSection;


