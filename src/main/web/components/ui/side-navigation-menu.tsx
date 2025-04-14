import { Component } from 'react';
import * as React from 'react';

class SideNavigationMenu extends Component<{ children: React.ReactNode }, {}> {

  navRef: React.RefObject<HTMLDivElement>;
  observer: IntersectionObserver | null

  constructor(props) {
    super(props);

    this.navRef = React.createRef<HTMLDivElement>();
    this.observer = null;
  
  }

  componentDidMount() {
    this.initObserver();
    this.attachClickListeners();
  }

  componentWillUnmount() {
    if (this.observer) {
      this.observer.disconnect();
    }

    if (this.navRef.current) {
      this.navRef.current.querySelectorAll(".nav-link").forEach((link) => {
        link.removeEventListener("click", this.handleClick);
      });
    }
  }

  // Build a finer-grained threshold list for more accurate ratio comparison
  buildThresholdList() {
    const thresholds = [];
    for (let i = 0; i <= 1.0; i += 0.01) {
      thresholds.push(i);
    }
    return thresholds;
  }

  initObserver() {
    if(this.observer) {
      return
    }
    
    const sections = Array.from(document.querySelectorAll('section'));
    const navLinks = Array.from(document.querySelectorAll('.rs-doc-navigation .nav-link'));

    const options = {
      root: null,
      rootMargin: "0px",
      threshold: this.buildThresholdList(),
    };

    const sectionVisibility = new Map();
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        sectionVisibility.set(entry.target.id, entry.intersectionRatio);
      });
  
      // Get the most visible section
      const mostVisibleSection = Array.from(sectionVisibility.entries())
        .filter(([id, ratio]) => ratio > 0)
        .sort((a, b) => b[1] - a[1])[0];
  
      if (mostVisibleSection) {
        const [visibleId] = mostVisibleSection;
  
        navLinks.forEach(link => {
          if (link.getAttribute('href') === `#${visibleId}`) {
            this.updateActiveLink(link);
          }
        });
      }
    }, options);
    
    
    sections.forEach(section => {
      if (section.id) {
        sectionVisibility.set(section.id, 0);
        observer.observe(section);
      }
    });
  }

  attachClickListeners() {
    if (this.navRef.current) {
      this.navRef.current.querySelectorAll(".nav-link").forEach((link) => {
        link.addEventListener("click", this.handleClick.bind(this));
      });
    }
  }

  handleClick(event) {
    event.preventDefault();
    const link = event.currentTarget;
    const id = link.getAttribute("href").replace("#", "");
    document.getElementById(id)?.scrollIntoView();
    this.updateActiveLink(link);
  }

  updateActiveLink(currentElement) {
    if(!currentElement.classList.contains("nav-link")) {
      return
    }

    // Remove 'active' class from all links
    document.querySelectorAll(".nav-link").forEach(el => el.classList.remove("active"));
    
    // Add 'active' class to clicked link and its ancestors
    while (currentElement && currentElement.classList.contains("nav-link")) {
      currentElement.classList.add("active");
      currentElement = currentElement.closest(".nav-item").parentElement.closest(".nav-item")?.querySelector(".nav-link");
    }
  }


  render() {
    return <div ref={this.navRef}>{this.props.children}</div>;
  }
}


export default SideNavigationMenu;
