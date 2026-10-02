import { SiteFooter } from "@/components/fantasy/SiteFooter";

export default function DailyDigestLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fx-page">
      {children}
      <SiteFooter />
    </div>
  );
}
