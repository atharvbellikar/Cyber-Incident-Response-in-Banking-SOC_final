"use client";

import StaggeredMenu from "@/components/visuals/StaggeredMenu";

export default function Sidebar() {
  const menuItems = [
    { label: 'Dashboard', ariaLabel: 'Go to Dashboard', link: '/dashboard' },
    { label: 'Ingest JSON', ariaLabel: 'Ingest Data', link: '/upload' }
  ];

  return (
    <>
      {/* 
        This replaces the fixed 72px width sidebar with a sleek, 
        staggered full-screen menu toggled by a hamburger icon.
      */}
      <StaggeredMenu
        isFixed={true}
        position="left"
        items={menuItems}
        displaySocials={false}
        displayItemNumbering={true}
        menuButtonColor="#38bdf8" // sky-400 to match the new highlighted CSS
        openMenuButtonColor="#ffffff"
        changeMenuColorOnOpen={true}
        colors={['#020617', '#0f172a', '#1e293b']} // Slate dark colors
        logoUrl="" // Empty to hide default logo
        accentColor="#0ea5e9" // sky-500
      />
      {/* 
        We add a hidden div to maintain backwards compatibility 
        in AppShell's flex layout if needed, but since it's hidden 
        it just lets the main content take full width.
      */}
      <aside className="hidden" />
    </>
  );
}