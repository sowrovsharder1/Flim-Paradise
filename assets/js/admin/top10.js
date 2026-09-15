document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("top10-form");
  const status = document.getElementById("top10-status");

  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    status.textContent = "Saving...";
    status.className = "form-status";

    const entries = [];

    for (let rank = 1; rank <= 10; rank++) {
      const titleInput = document.getElementById(`top10-title-${rank}`);
      const yearInput = document.getElementById(`top10-year-${rank}`);
      const languageInput = document.getElementById(`top10-language-${rank}`);
      const descriptionInput = document.getElementById(
        `top10-description-${rank}`
      );

      const title = titleInput?.value.trim() || "";
      const releaseYear = yearInput?.value.trim() || "";
      const language = languageInput?.value.trim() || "";
      const shortDescription =
        descriptionInput?.value.trim() || "";

      if (!title && !language && !shortDescription && !releaseYear) {
        continue;
      }

      if (!title) {
        status.textContent = `Rank ${rank}: Movie title is required.`;
        status.className = "form-status error";
        return;
      }

      if (!language) {
        status.textContent = `Rank ${rank}: Language is required.`;
        status.className = "form-status error";
        return;
      }

      entries.push({
        rank,
        title,
        release_year: releaseYear,
        language,
        short_description: shortDescription,
        poster_key: "",
        poster_url: ""
      });
    }

    if (entries.length === 0) {
      status.textContent = "Please add at least one Top 10 movie.";
      status.className = "form-status error";
      return;
    }

    try {
      for (const entry of entries) {
        const response = await fetch("/api/top10", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(entry)
        });

        const data = await response.json();

        if (!response.ok || !data.ok) {
          throw new Error(
            data.error || `Failed to save rank ${entry.rank}.`
          );
        }
      }

      status.textContent = "Top 10 saved successfully.";
      status.className = "form-status success";
    } catch (error) {
      console.error(error);

      status.textContent =
        error.message || "Something went wrong while saving.";
      status.className = "form-status error";
    }
  });
});
