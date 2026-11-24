import { useState } from 'react';

const services = [
  {
    id: 'websites', title: 'Websites & digital experiences',
    summary: 'A home for your business. Built to work.',
    description: 'Turn the way people discover your business into an experience that feels clear, considered and easy to use.',
    deliverables: ['Business websites & landing pages', 'E-commerce experiences', 'Website updates & ongoing care'],
  },
  {
    id: 'strategy', title: 'Digital strategy & campaigns',
    summary: 'A clear direction for every next move.',
    description: 'Bring your message, channels and creative together around what your business needs to communicate.',
    deliverables: ['Marketing & campaign planning', 'Audience and channel direction', 'Campaign coordination & reporting'],
  },
  {
    id: 'content', title: 'Social media & content',
    summary: 'Your story, told with purpose.',
    description: 'Give your business a consistent voice with content that connects your brand, products and people across channels.',
    deliverables: ['Content strategy & calendars', 'Copywriting & social creative', 'Social channel management'],
  },
  {
    id: 'production', title: 'Video & photography',
    summary: 'Ideas worth seeing. Stories worth sharing.',
    description: 'From the first concept to the final edit, create imagery that shows your business at its best.',
    deliverables: ['Brand films & video shoots', 'Product & business photography', 'Reels, editing & post-production'],
  },
  {
    id: 'performance', title: 'Search & paid media',
    summary: 'Be there when people are looking.',
    description: 'Connect your business with relevant searches and audiences through considered organic and paid campaigns.',
    deliverables: ['SEO & local search visibility', 'Search & social advertising', 'Campaign tracking & insights'],
  },
  {
    id: 'branding', title: 'Branding & design',
    summary: 'A distinct identity. A consistent impression.',
    description: 'Build a visual language that feels like your business, from its identity to the everyday details people see.',
    deliverables: ['Brand identity & visual direction', 'Graphic design & brand assets', 'Campaign & marketing creative'],
  },
  {
    id: 'journeys', title: 'Email & customer journeys',
    summary: 'Keep the conversation going.',
    description: 'Create useful, well-timed communications that help your business stay connected with its customers.',
    deliverables: ['Email campaigns & newsletters', 'Marketing automation', 'Customer communication journeys'],
  },
];

export default function ServicesPage({ onContact }: { onContact: () => void }) {
  const [expanded, setExpanded] = useState<string | null>('websites');
  return <div className="services-content">
    <section className="services-hero" aria-labelledby="services-title">
      <div className="services-breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><span>Services</span></div>
      <div className="services-opening">
        <div>
          <p className="section-label">A full-service creative & digital partner</p>
          <h1 id="services-title" className="services-title">Your business.<br /><span>Our full focus.</span></h1>
        </div>
        <div className="services-intro">
          <p>Digital marketing, websites, content and video. Everything your business needs to show up with purpose.</p>
          <a className="text-link" href="#our-services">Find your focus</a>
        </div>
      </div>
      <div className="services-hero-line" aria-hidden="true" />
    </section>

    <section id="our-services" className="services-catalogue" aria-labelledby="catalogue-title">
      <div className="catalogue-heading"><h2 id="catalogue-title">Services, in focus.</h2><p>One connected approach.<br />{' '}The right mix for your business.</p></div>
      <div className="service-list">
        {services.map(service => {
          const open = expanded === service.id;
          return <article className={`service-row ${open ? 'is-expanded' : ''}`} key={service.id}>
            <h3><button
              id={`trigger-${service.id}`}
              className="service-trigger"
              aria-expanded={open}
              aria-controls={`details-${service.id}`}
              onClick={() => setExpanded(open ? null : service.id)}
            >
              <span className="service-title">{service.title}</span>
              <span className="service-summary">{service.summary}</span>
              <span className="service-toggle" aria-hidden="true" />
            </button></h3>
            <div id={`details-${service.id}`} className="service-details" role="region" aria-labelledby={`trigger-${service.id}`} hidden={!open}>
              <p>{service.description}</p>
              <ul>{service.deliverables.map(item => <li key={item}>{item}</li>)}</ul>
            </div>
          </article>;
        })}
      </div>
    </section>

    <section className="services-closing" aria-labelledby="closing-title">
      <div><p className="section-label">Let's bring it together</p><h2 id="closing-title">What's next<br />for your business?</h2></div>
      <div className="closing-action"><p>Start with an idea, a challenge or a fresh perspective. We can explore the right mix of services together.</p><button className="conversation-button" onClick={onContact}>Start a conversation</button></div>
    </section>
    <div className="services-signoff"><a href="/">Back to the studio</a><span>Shoot. Scale. Shine.</span></div>
  </div>;
}
