(function () {
  let slugParam = null;

  const f = document.getElementById('form');
  const { apiFetch, esc } = window.fp;

  function slugify(s) {
    return String(s || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async function cats(selected = []) {
    const d = await apiFetch('/categories');

    document.getElementById('cats').innerHTML =
      d.categories.map(c => `
        <label>
          <input
            type="checkbox"
            value="${c.id}"
            ${selected.includes(c.id) ? 'checked' : ''}
          >
          ${esc(c.name)}
        </label>
      `).join('');
  }

  function selectedCats() {
    return [...document.querySelectorAll('#cats input:checked')]
      .map(x => Number(x.value));
  }

  function preview(url) {
    document.getElementById('preview').innerHTML =
      url
        ? `<img src="${esc(url)}" alt="poster preview">`
        : '';
  }

  async function upload() {
    const file = document.getElementById('posterFile').files[0];

    if (!file) return;

    const msg = document.getElementById('uploadMsg');

    msg.textContent = 'Uploading…';

    const fd = new FormData();
    fd.append('file', file);

    try {
      const d = await fetch('/api/admin/upload', {
        method: 'POST',
        body: fd,
        credentials: 'include'
      }).then(async r => {
        const x = await r.json();

        if (!r.ok) {
          throw new Error(x.error || 'Upload failed.');
        }

        return x;
      });

      document.getElementById('posterUrl').value = d.url;

      preview(d.url);

      msg.textContent = 'Poster uploaded.';
      msg.className = 'form-msg ok';

    } catch (e) {
      msg.textContent = e.message;
      msg.className = 'form-msg err';
    }
  }

  async function load() {
    const p = new URLSearchParams(location.search);

    slugParam = p.get('slug');

    await cats();

    if (!slugParam) return;

    const d = await apiFetch(
      '/movies/' + encodeURIComponent(slugParam)
    );

    const m = d.movie;

    document.getElementById('heading').textContent =
      'Edit: ' + m.title;

    document.getElementById('deleteBtn').style.display =
      'inline-flex';

    /*
     * Fill all form fields
     */
    for (const [k, v] of Object.entries(m)) {

      if (!f.elements[k]) continue;

      if (f.elements[k].type === 'checkbox') {
        f.elements[k].checked = !!v;
      } else {
        f.elements[k].value = v ?? '';
      }
    }

    /*
     * Slug
     */
    document.getElementById('slug').value =
      m.slug || '';

    /*
     * Poster
     */
    document.getElementById('posterUrl').value =
      m.poster_url || '';

    preview(m.poster_url);

    /*
     * Categories
     */
    await cats(
      (d.categories || []).map(x => x.id)
    );
  }

  async function save(e) {
    e.preventDefault();

    const msg = document.getElementById('msg');

    msg.textContent = 'Saving…';
    msg.className = 'form-msg';

    const fd = new FormData(f);

    const b = Object.fromEntries(fd.entries());

    /*
     * Numeric fields
     */
    b.year =
      b.year !== ''
        ? Number(b.year)
        : null;

    b.imdb_rating =
      b.imdb_rating !== ''
        ? Number(b.imdb_rating)
        : null;

    b.review_rating =
      b.review_rating !== ''
        ? Number(b.review_rating)
        : null;

    /*
     * Checkboxes
     */
    b.show_home =
      f.elements.show_home
        ? f.elements.show_home.checked
        : false;

    b.show_review =
      f.elements.show_review
        ? f.elements.show_review.checked
        : false;

    b.show_trailer =
      f.elements.show_trailer
        ? f.elements.show_trailer.checked
        : false;

    b.is_recommended =
      f.elements.is_recommended
        ? f.elements.is_recommended.checked
        : false;

    b.is_featured =
      f.elements.is_featured
        ? f.elements.is_featured.checked
        : false;

    /*
     * Keep old pinned system compatible.
     * Recommended = pinned internally.
     */
    b.is_pinned = b.is_recommended;

    /*
     * Categories
     */
    b.category_ids = selectedCats();

    /*
     * Auto slug
     */
    if (!b.slug) {
      b.slug = slugify(b.title);
    }

    try {

      if (slugParam) {

        await apiFetch(
          '/movies/' + encodeURIComponent(slugParam),
          {
            method: 'PUT',
            body: JSON.stringify(b)
          }
        );

      } else {

        await apiFetch(
          '/movies',
          {
            method: 'POST',
            body: JSON.stringify(b)
          }
        );
      }

      msg.textContent = 'Saved successfully.';
      msg.className = 'form-msg ok';

      /*
       * Give the success message a moment,
       * then return to Movies & Series.
       */
      setTimeout(() => {
        location.href = '/admin/movies.html';
      }, 500);

    } catch (e) {

      console.error('Movie save error:', e);

      msg.textContent =
        e.message || 'Could not save this title.';

      msg.className = 'form-msg err';
    }
  }

  async function del() {

    if (!slugParam) return;

    if (!confirm('Delete this title?')) {
      return;
    }

    try {

      await apiFetch(
        '/movies/' + encodeURIComponent(slugParam),
        {
          method: 'DELETE'
        }
      );

      location.href = '/admin/movies.html';

    } catch (e) {

      alert(e.message);
    }
  }

  document.addEventListener(
    'DOMContentLoaded',
    async () => {

      await admin.requireLogin();

      /*
       * Auto slug while adding a new title
       */
      document
        .getElementById('title')
        .addEventListener('input', e => {

          if (
            !slugParam &&
            !document.getElementById('slug').value
          ) {
            document.getElementById('slug').value =
              slugify(e.target.value);
          }

        });

      /*
       * Poster upload
       */
      document
        .getElementById('posterFile')
        .addEventListener('change', upload);

      /*
       * Poster URL preview
       */
      document
        .getElementById('posterUrl')
        .addEventListener('input', e => {
          preview(e.target.value);
        });

      /*
       * Save
       */
      f.addEventListener('submit', save);

      /*
       * Delete
       */
      document
        .getElementById('deleteBtn')
        .addEventListener('click', del);

      /*
       * Load existing movie
       */
      load().catch(e => {
        console.error(e);
        alert(e.message);
      });

    }
  );

})();
