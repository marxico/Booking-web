import { business, navItems } from "../data/business";

type SiteHeaderProps = {
  activeSection: string;
};

export function SiteHeader({ activeSection }: SiteHeaderProps) {
  const navClass = (id: string) => activeSection === id ? "active" : "";

  return (
    <header className="site-header scrolled" id="siteHeader">
      <div className="nav-shell">
        <a className="brand brand--logo" href="#home" aria-label={`${business.name} home`}>
          <img className="brand__mark" src={business.logo} alt={`${business.name} logo`} />
          <span className="brand__text">
            <strong>{business.name}</strong>
            <span>{business.tagline}</span>
          </span>
        </a>
        <nav className="nav-links" aria-label="Primary navigation">
          {navItems.map((item) => (
            <a key={item.id} href={`#${item.id}`} className={navClass(item.id)}>
              {item.label}
            </a>
          ))}
        </nav>
        <a className="nav-phone" href={business.phoneHref}>{business.phone}</a>
      </div>
    </header>
  );
}
