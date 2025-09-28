import { GraduationCap, Mail, Phone, MapPin } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-card border-t border-border">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <GraduationCap className="h-6 w-6 text-primary" />
              <span className="text-lg font-bold">Master Education</span>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Modern educational platform for effective online learning
            </p>
            <div className="text-sm text-muted-foreground">mastereducation.kz</div>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Platform</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="#" className="hover:text-foreground transition-colors">For Students</a>
              </li>
              <li>
                <a href="#" className="hover:text-foreground transition-colors">For Teachers</a>
              </li>
              <li>
                <a href="#" className="hover:text-foreground transition-colors">For Administrators</a>
              </li>
              <li>
                <a href="#" className="hover:text-foreground transition-colors">Features</a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Support</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground transition-colors">Documentation</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Guides</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">FAQ</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Technical Support</a></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Contacts</h3>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2"><Mail className="h-4 w-4" /><span>info@mastereducation.kz</span></div>
              <div className="flex items-center gap-2"><Phone className="h-4 w-4" /><span>+7 (777) 123-45-67</span></div>
              <div className="flex items-center gap-2"><MapPin className="h-4 w-4" /><span>Almaty, Kazakhstan</span></div>
            </div>
          </div>
        </div>

        <div className="border-t border-border mt-12 pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; 2025 Master Education. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;


