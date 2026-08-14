export class Router {
  private listeners: ((route: string) => void)[] = [];

  getRoute(): string {
    const hash = window.location.hash.replace(/^#\/?/, '');
    return hash || 'dashboard';
  }

  navigate(route: string) {
    const clean = route.replace(/^\//, '');
    if (window.location.hash !== '#' + clean) {
      window.location.hash = clean;
    }
    this.listeners.forEach(fn => fn(clean));
  }

  onChange(fn: (route: string) => void) {
    this.listeners.push(fn);
  }
}
