(function () {
  const { apiFetch, esc } = window.fp;

  let editingSlug = null;
  let categories = [];

  const form = document.getElementById('form');
  const msg = document.getElementById('msg');
  const heading = document.getElementById('heading');
  const deleteBtn = document.getElementById('deleteBtn');

  const posterFile = document.getElementById('posterFile');
  const posterUrl = document.getElementById('posterUrl');
  const preview = document.getElementById('preview');
  const uploadMsg = document.getElementById('uploadMsg');

  const placeholder =
    'data:image/svg+xml;charset=UTF-8,' +
    encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg"
           viewBox="0 0 400 600">
        <rect width="100%" height="100%" fill="#121216"/>
        <text x="50%" y="50%"
              fill="#777"
              font-family="Arial"
              font-size="22"
              text-anchor="middle">
          FILM PARADISE
        </text>
      </svg>
    `);

  function setMsg(text, type = '') {
    msg.textContent = text;
    msg.className = 'form-msg' + (type ? ' ' + type : '');
  }

  function setPreview(url) {
    preview.innerHTML = '';

    if (!url) return;

    const img = document.createElement('img');
    img.src = url;
    img.alt = 'Poster preview';

    img.onerror = function () {
      img.src = placeholder;
    };

    preview.appendChild(img);
  }

  function slugify(text) {
    return String(text || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function renderCategories(selectedIds = []) {
    const box = document.getElementById('cats');

    if (!categories.length) {
      box.innerHTML = '<span class="empty">No categories found.</span>';
      return;
    }

    const selected = new Set(
      (selectedIds || []).map(Number)
    );

    box.innerHTML = categories
      .map(c => {
        const checked = selected.has(Number(c.id))
          ? 'checked'
          : '';

        return `
          <label class="chip">
            <input
              type="checkbox"
              name="category_ids"
              value="${Number(c.id)}"
              ${checked}
            >
            <span>${esc(c.name)}</span>
          </label>
        `;
      })
      .join('');
  }

  async function loadCategories() {
    try {
      const data = await apiFetch('/categories');

      categories =
        Array.isArray(data)
          ? data
          : (data.categories || []);

      renderCategories([]);
    } catch (e) {
      document.getElementById('cats').innerHTML =
        `<span class="empty">${esc(e.message)}</span>`;
    }
  }

  function fillForm(m) {
    const fields = [
      'title',
      'slug',
      'year',
      'language',
      'country',
      'genre',
      'quality',
      'duration',
      'release_date',
      'director',
      'cast',
      'trailer_url',
      'box_office',
      'quick_summary',
      'review_body',
      'review_pros',
      'review_cons',
      'who_should_watch',
      'review_verdict',
      'review_rating',
      'status'
    ];

    fields.forEach(name => {
      const el = form.elements[name];
      if (!el) return;

      let value = m[name];

      if (value === null || value === undefined) {
        value = '';
      }

      el.value = value;
    });

    /*
     * Type
     */
    if (form.elements.type) {
      form.elements.type.value =
        m.type || 'movie';
    }

    /*
     * IMDb rating
     */
    if (form.elements.imdb_rating) {
      form.elements.imdb_rating.value =
        m.imdb_rating ?? '';
    }

    /*
     * Poster
     */
    posterUrl.value = m.poster_url || '';
    setPreview(m.poster_url || '');

    /*
     * Placement checkboxes
     */
    form.elements.show_home.checked =
      Number(m.show_home) === 1;

    form.elements.show_review.checked =
      Number(m.show_review) === 1;

    form.elements.show_trailer.checked =
      Number(m.show_trailer) === 1;

    form.elements.is_recommended.checked =
      Number(m.is_recommended) === 1;

    /*
     * Featured
     *
     * Keep compatibility with the existing
     * movies.is_featured column.
     */
    form.elements.is_featured.checked =
      Number(m.is_featured) === 1;

    /*
     * Categories
     */
    const categoryIds =
      Array.isArray(m.categories)
        ? m.categories.map(c =>
            typeof c === 'object'
              ? c.id
              : c
          )
        : [];

    renderCategories(categoryIds);
  }

  async function loadMovie(slug) {
    try {
      const data =
        await apiFetch(
          '/movies/' +
          encodeURIComponent(slug)
        );

      if (!data || !data.movie) {
        throw new Error('Movie not found.');
      }

      editingSlug = slug;

      heading.textContent = 'Edit Title';
      deleteBtn.style.display = 'inline-flex';

      fillForm(data.movie);
    } catch (e) {
      setMsg(e.message, 'err');
    }
  }

  async function uploadPoster(file) {
    if (!file) return null;

    uploadMsg.textContent = 'Uploading poster…';

    try {
      const body = new FormData();
      body.append('file', file);

      /*
       * Existing poster upload endpoint.
       */
      const result =
        await apiFetch('/upload', {
          method: 'POST',
          body
        });

      const url =
        result.url ||
        result.poster_url ||
        result.path;

      if (!url) {
        throw new Error(
          'Poster upload did not return an image URL.'
        );
      }

      uploadMsg.textContent =
        'Poster uploaded successfully.';

      return url;
    } catch (e) {
      uploadMsg.textContent =
        e.message || 'Poster upload failed.';

      throw e;
    }
  }

  async function saveMovie(e) {
    e.preventDefault();

    const button =
      document.getElementById('save');

    button.disabled = true;
    setMsg(
      editingSlug
        ? 'Updating title…'
        : 'Saving title…'
    );

    try {
      /*
       * Upload poster first if a new file
       * has been selected.
       */
      let uploadedPoster = null;

      if (posterFile.files && posterFile.files[0]) {
        uploadedPoster =
          await uploadPoster(
            posterFile.files[0]
          );
      }

      const fd = new FormData(form);

      /*
       * Convert FormData to normal object.
       */
      const body =
        Object.fromEntries(fd.entries());

      /*
       * Generate slug if empty.
       */
      if (!body.slug && body.title) {
        body.slug = slugify(body.title);
      }

      /*
       * Poster.
       */
      if (uploadedPoster) {
        body.poster_url = uploadedPoster;
      }

      body.year =
        body.year
          ? Number(body.year)
          : null;

      body.imdb_rating =
        body.imdb_rating
          ? Number(body.imdb_rating)
          : null;

      body.review_rating =
        body.review_rating
          ? Number(body.review_rating)
          : null;

      /*
       * Checkbox values.
       */
      body.show_home =
        form.elements.show_home.checked
          ? 1
          : 0;

      body.show_review =
        form.elements.show_review.checked
          ? 1
          : 0;

      body.show_trailer =
        form.elements.show_trailer.checked
          ? 1
          : 0;

      body.is_recommended =
        form.elements.is_recommended.checked
          ? 1
          : 0;

      body.is_featured =
        form.elements.is_featured.checked
          ? 1
          : 0;

      /*
       * Categories.
       */
      body.category_ids =
        Array.from(
          form.querySelectorAll(
            'input[name="category_ids"]:checked'
          )
        ).map(input =>
          Number(input.value)
        );

      /*
       * Don't send the checkbox
       * helper field as a string.
       */
      delete body.category_ids_unused;

      /*
       * Remove file input from JSON body.
       */
      delete body.posterFile;

      /*
       * Save.
       */
      let result;

      if (editingSlug) {
        result =
          await apiFetch(
            '/movies/' +
            encodeURIComponent(editingSlug),
            {
              method: 'PUT',
              body: JSON.stringify(body)
            }
          );
      } else {
        result =
          await apiFetch(
            '/movies',
            {
              method: 'POST',
              body: JSON.stringify(body)
            }
          );
      }

      /*
       * If API returns a new slug,
       * keep it for future edits.
       */
      if (result && result.movie) {
        editingSlug =
          result.movie.slug ||
          body.slug ||
          editingSlug;
      }

      setMsg(
        editingSlug
          ? 'Title saved successfully.'
          : 'Title created successfully.',
        'ok'
      );

      /*
       * If this was a new title,
       * change the page into edit mode.
       */
      if (!deleteBtn.style.display ||
          deleteBtn.style.display === 'none') {

        deleteBtn.style.display =
          'inline-flex';

        heading.textContent =
          'Edit Title';
      }

      /*
       * Update URL without reloading.
       */
      if (editingSlug) {
        const newUrl =
          '/admin/movie-form.html?slug=' +
          encodeURIComponent(editingSlug);

        history.replaceState(
          {},
          '',
          newUrl
        );
      }

    } catch (e) {
      setMsg(
        e.message ||
        'Could not save title.',
        'err'
      );
    } finally {
      button.disabled = false;
    }
  }

  async function deleteMovie() {
    if (!editingSlug) return;

    const ok =
      confirm(
        'Are you sure you want to delete this title?'
      );

    if (!ok) return;

    deleteBtn.disabled = true;
    setMsg('Deleting title…');

    try {
      await apiFetch(
        '/movies/' +
        encodeURIComponent(editingSlug),
        {
          method: 'DELETE'
        }
      );

      setMsg(
        'Title deleted successfully.',
        'ok'
      );

      setTimeout(() => {
        location.href =
          '/admin/movies.html';
      }, 700);

    } catch (e) {
      deleteBtn.disabled = false;

      setMsg(
        e.message ||
        'Could not delete title.',
        'err'
      );
    }
  }

  /*
   * Auto-generate slug from title
   * only when creating a new title.
   */
  const titleInput =
    document.getElementById('title');

  const slugInput =
    document.getElementById('slug');

  titleInput.addEventListener(
    'input',
    function () {
      if (!editingSlug &&
          !slugInput.value.trim()) {
        slugInput.value =
          slugify(titleInput.value);
      }
    }
  );

  /*
   * Poster URL preview.
   */
  posterUrl.addEventListener(
    'input',
    function () {
      setPreview(
        posterUrl.value.trim()
      );
    }
  );

  /*
   * Local poster preview.
   */
  posterFile.addEventListener(
    'change',
    function () {
      const file =
        posterFile.files &&
        posterFile.files[0];

      if (!file) return;

      const url =
        URL.createObjectURL(file);

      setPreview(url);
      uploadMsg.textContent =
        'Poster selected. It will upload when you save.';
    }
  );

  /*
   * Submit.
   */
  form.addEventListener(
    'submit',
    saveMovie
  );

  /*
   * Delete.
   */
  deleteBtn.addEventListener(
    'click',
    deleteMovie
  );

  /*
   * Initial load.
   */
  document.addEventListener(
    'DOMContentLoaded',
    async function () {
      await loadCategories();

      const params =
        new URLSearchParams(
          location.search
        );

      const slug =
        params.get('slug');

      if (slug) {
        await loadMovie(slug);
      }
    }
  );
})();
