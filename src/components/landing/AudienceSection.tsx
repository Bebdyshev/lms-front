import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { GraduationCap, Users, Settings } from "lucide-react";

export function AudienceSection() {
  return (
    <section id="audience" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-balance mb-6">Who the Platform is For</h2>
          <p className="text-lg text-muted-foreground text-balance leading-relaxed">
            Master Education is suitable for all participants in the educational process
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader className="pb-6">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <GraduationCap className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-xl">For Students</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="text-sm text-muted-foreground space-y-2 text-left">
                <li>• View courses with progress tracking</li>
                <li>• Interactive lessons and materials</li>
                <li>• Complete assignments and tests</li>
                <li>• Communicate with teachers</li>
                <li>• Event calendar and deadlines</li>
                <li>• Personal learning statistics</li>
              </ul>
              <Button className="w-full mt-6">Start Learning</Button>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader className="pb-6">
              <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-accent" />
              </div>
              <CardTitle className="text-xl">For Teachers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="text-sm text-muted-foreground space-y-2 text-left">
                <li>• Create and manage courses</li>
                <li>• Lesson and material builder</li>
                <li>• Assignment and grading system</li>
                <li>• Manage student groups</li>
                <li>• Student progress analytics</li>
                <li>• Planning and calendar</li>
              </ul>
              <Button variant="outline" className="w-full mt-6 bg-transparent">
                Create Course
              </Button>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader className="pb-6">
              <div className="w-16 h-16 bg-secondary/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Settings className="h-8 w-8 text-secondary-foreground" />
              </div>
              <CardTitle className="text-xl">For Administrators</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="text-sm text-muted-foreground space-y-2 text-left">
                <li>• User management</li>
                <li>• Platform-wide analytics</li>
                <li>• Event management</li>
                <li>• System configuration</li>
                <li>• Activity monitoring</li>
                <li>• Reports and statistics</li>
              </ul>
              <Button variant="secondary" className="w-full mt-6">
                Control Panel
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

export default AudienceSection;


