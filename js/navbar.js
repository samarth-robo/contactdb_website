// should match with document.title
const navbar_page_ids = [
    'ContactDB',
    'ContactDB Explorer',
    'ContactGrasp',
    'Grasp Capture'
];
const navbar_page_urls = [
    'index.html',
    'contactdb_explorer.html',
    'contactgrasp.html',
    'grasp_capture.html'
];

function create_navbar() {
    let navbar_container = document.createElement('div');
    navbar_container.setAttribute('class', 'container');

    let navbar = document.createElement('nav');
    navbar.setAttribute('class', 'navbar navbar-expand-lg navbar-dark bg-dark');
    navbar_container.appendChild(navbar);

    let navbar_brand = document.createElement('a');
    navbar_brand.setAttribute('class', 'navbar-brand');
    navbar_brand.setAttribute('href', navbar_page_urls[0]);
    navbar_brand.innerHTML = 'ContactDB';
    navbar.appendChild(navbar_brand);

    let navbar_toggler = document.createElement('button');
    navbar_toggler.setAttribute('class', 'navbar-toggler');
    navbar_toggler.setAttribute('type', 'button');
    navbar_toggler.setAttribute('data-toggle', 'collapse');
    navbar_toggler.setAttribute('data-target', '#navbarSupportedContent');
    navbar_toggler.setAttribute('aria-controls', 'navbarSupportedContent');
    navbar_toggler.setAttribute('aria-expanded', 'false');
    navbar_toggler.setAttribute('aria-label', 'toggle');
    let toggler_span = document.createElement('span');
    toggler_span.setAttribute('class', 'navbar-toggler-icon');
    navbar_toggler.appendChild(toggler_span);
    navbar.appendChild(navbar_toggler);

    let navbar_content = document.createElement('div');
    navbar_content.setAttribute('class', 'collapse navbar-collapse');
    navbar_content.setAttribute('id', 'navbarSupportedContent');
    navbar.appendChild(navbar_content);

    let navbar_nav = document.createElement('div');
    navbar_nav.setAttribute('class', 'navbar-nav');
    navbar_content.appendChild(navbar_nav);

    let i;
    for (i=1; i<navbar_page_ids.length; i++) {
        let class_name = 'nav-item nav-link';
        if (document.title === navbar_page_ids[i]) {
            class_name += ' active';
        }

        let nav_item = document.createElement('a');
        nav_item.setAttribute('class', class_name);
        nav_item.setAttribute('href', navbar_page_urls[i]);
        nav_item.innerHTML = navbar_page_ids[i];
        navbar_nav.appendChild(nav_item);
    }

    document.body.insertBefore(navbar_container, document.body.firstChild);
}