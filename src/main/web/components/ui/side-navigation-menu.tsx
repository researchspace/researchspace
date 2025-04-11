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
    // this.initObserver();
    this.attachClickListeners();
    window.addEventListener("wheel", this.initObserver.bind(this));
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

    window.removeEventListener("wheel", this.initObserver.bind(this));
  }

  initObserver() {
    if(this.observer) {
      return
    }
    
    const options = {
      root: null,
      rootMargin: "0px",
      threshold: 0.6,
    };
    
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach((entry: IntersectionObserverEntry) => {
        if (entry.isIntersecting) {
          this.updateActiveLink(document.querySelector(`a[href="#${entry.target.id}"`));
        }
      });
    });
    
    
    document.querySelectorAll("section[id]") .forEach((section) => {
      this.observer.observe(section);
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
    if(!currentElement.classList.contains("nav-link")) {return}

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
