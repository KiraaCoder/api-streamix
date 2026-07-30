const cheerio = require("cheerio");
const fetchData = require("../utils/helper/fetch");
const baseUrl = require("../utils/constant/url");
const {
  getStreamingLinks,
  extractIframeSrc,
} = require("../utils/helper/iframe");
const {
  getNonce,
  processDownloadLinks,
} = require("../utils/helper/get-episode");

const getOngoingAnime = async (req, res) => {
  const page = req.params.page || 1;
  const url = `${baseUrl.anime}/ongoing-anime/page/${page}`;

  try {
    const data = await fetchData(url, res);
    const $ = cheerio.load(data);
    let ongoingAnime = [];

    // Mengambil data anime
    $(".venz > ul > li").each((index, element) => {
      const title = $(element).find("h2").text().trim();
      const image = $(element).find("img").attr("src");
      const episode = $(element).find(".epz").text().trim();
      const updated_day = $(element).find(".epztipe").text().trim();
      const updated_on = $(element).find(".newnime").text().trim();
      const endpoint = $(element).find(".thumb > a").attr("href");

      // Memastikan endpoint ada sebelum di-split
      const anime_id = endpoint ? endpoint.split("/")[4] : null;

      ongoingAnime.push({
        title,
        image,
        episode,
        updated_day,
        updated_on,
        anime_id,
      });
    });

    // --- LOGIKA PAGINATION ---
    const paginationContainer = $(".pagenavix");
    const currentPage =
      parseInt(paginationContainer.find(".page-numbers.current").text()) || 1;

    // Mengambil Max Page
    // Kita cari semua .page-numbers, filter yang hanya angka, lalu ambil yang paling besar
    let maxPage = 0;
    paginationContainer.find(".page-numbers").each((i, el) => {
      const pageText = $(el)
        .text()
        .replace(/[^0-9]/g, ""); // Hanya ambil angka
      if (pageText) {
        const pageNum = parseInt(pageText);
        if (pageNum > maxPage) maxPage = pageNum;
      }
    });

    const hasNextPage =
      paginationContainer.find(".next.page-numbers").length > 0;
    const hasPrevPage =
      paginationContainer.find(".prev.page-numbers").length > 0;

    res.send({
      status: true,
      message: "success get ongoing anime",
      data: ongoingAnime,
      pagination: {
        current_page: currentPage,
        max_page: maxPage,
        has_next_page: hasNextPage,
        has_prev_page: hasPrevPage,
      },
    });
  } catch (error) {
    res.send({
      status: false,
      message: error.message,
    });
  }
};

const getFinishedAnime = async (req, res) => {
  const page = req.params.page || 1;
  const url = `${baseUrl.anime}/complete-anime/page/${page}`;
  try {
    const data = await fetchData(url, res);
    const $ = cheerio.load(data);
    let finishedAnime = [];

    $(".venz > ul > li").each((index, element) => {
      const title = $(element).find("h2").text();
      const image = $(element).find("img").attr("src");
      const episode = $(element).find(".epz").text();
      const rating = $(element).find(".epztipe").text().trim();
      const updated_on = $(element).find(".newnime").text();
      const anime_id = $(element).find(".thumb > a").attr("href").split("/")[4];

      finishedAnime.push({
        title,
        image,
        episode,
        rating,
        updated_on,
        anime_id,
      });
    });

    // --- LOGIKA PAGINATION ---
    const paginationContainer = $(".pagenavix");
    const currentPage =
      parseInt(paginationContainer.find(".page-numbers.current").text()) || 1;

    // Mengambil Max Page
    // Kita cari semua .page-numbers, filter yang hanya angka, lalu ambil yang paling besar
    let maxPage = 0;
    paginationContainer.find(".page-numbers").each((i, el) => {
      const pageText = $(el)
        .text()
        .replace(/[^0-9]/g, ""); // Hanya ambil angka
      if (pageText) {
        const pageNum = parseInt(pageText);
        if (pageNum > maxPage) maxPage = pageNum;
      }
    });

    const hasNextPage =
      paginationContainer.find(".next.page-numbers").length > 0;
    const hasPrevPage =
      paginationContainer.find(".prev.page-numbers").length > 0;

    res.send({
      status: true,
      message: "success get ongoing anime",
      data: finishedAnime,
      pagination: {
        current_page: currentPage,
        max_page: maxPage,
        has_next_page: hasNextPage,
        has_prev_page: hasPrevPage,
      },
    });
  } catch (error) {
    res.send({
      status: false,
      message: error.message,
    });
  }
};

const getListAnime = async (req, res) => {
  const url = `${baseUrl.anime}/anime-list/`;
  try {
    const data = await fetchData(url, res);
    const $ = cheerio.load(data);

    let animeList = [];

    $(".bariskelom").each((index, element) => {
      $(element)
        .find(".penzbar")
        .each((i, item) => {
          const titleElement = $(item).find(".jdlbar a");
          if (titleElement.length > 0) {
            const title = $(item).find(".jdlbar a").text().trim();
            const anime_id = $(item)
              .find(".jdlbar a")
              .attr("href")
              .split("/")[4];

            // Check status anime if available
            // const status = $(item).find(".jdlbar span").text().trim();

            animeList.push({
              title,
              anime_id,
              // status,
            });
          }
        });
    });

    res.send({
      status: true,
      message: "success get anime list",
      data: animeList,
    });
  } catch (error) {
    res.send({
      status: false,
      message: error.message,
    });
  }
};

// const searchAnime = async (req, res) => {
//   const query = req.query.query;
//   const url = `${baseUrl.anime}/?s=${query}&post_type=anime`;
//   try {
//     const data = await fetchData(url, res);
//     const $ = cheerio.load(data);

//     let searchResults = [];

//     $(".chivsrc li").each((index, element) => {
//       const title = $(element).find("h2 > a").text().trim();
//       const anime_id = $(element).find("h2 > a").attr("href").split("/")[4];
//       const image = $(element).find("img").attr("src");

//       const genres = [];
//       $(element)
//         .find(".set")
//         .first()
//         .find("a")
//         .each((i, genre) => {
//           genres.push($(genre).text().trim());
//         });

//       const status = $(element)
//         .find(".set")
//         .eq(1)
//         .text()
//         .replace(/^Status\s*[:\-]?\s*/, "")
//         .trim();

//       const rating = $(element)
//         .find(".set")
//         .eq(2)
//         .text()
//         .replace(/^Rating\s*[:\-]?\s*/, "")
//         .trim();

//       searchResults.push({
//         title,
//         anime_id,
//         image,
//         genres,
//         status,
//         rating,
//       });
//     });

//     res.send({
//       status: true,
//       message: "success search anime",
//       data: searchResults,
//     });
//   } catch (error) {
//     res.send({
//       status: false,
//       message: error.message,
//     });
//   }
// };

const searchAnime = async (req, res) => {
  // Mengambil query dari 's' atau 'query' agar lebih fleksibel
  const query = req.query.s || req.query.query;

  if (!query) {
    return res.send({
      status: false,
      message: "Query parameter 's' or 'query' is required",
    });
  }

  const url = `${baseUrl.anime}/?s=${query}&post_type=anime`;

  try {
    const data = await fetchData(url, res);
    const $ = cheerio.load(data);

    let searchResults = [];

    $(".chivsrc li").each((index, element) => {
      const title = $(element).find("h2 > a").text().trim();
      const rawUrl = $(element).find("h2 > a").attr("href");

      // Cara lebih aman mengambil anime_id (slug) dari URL
      // Menghapus trailing slash jika ada, lalu ambil bagian terakhir
      const anime_id = rawUrl.replace(/\/$/, "").split("/").pop();

      const image = $(element).find("img").attr("src");

      const genres = [];
      $(element)
        .find(".set")
        .first()
        .find("a")
        .each((i, genre) => {
          genres.push($(genre).text().trim());
        });

      // Mengambil teks saja dan membersihkan label "Status :" atau "Rating :"
      const status =
        $(element).find(".set").eq(1).text().split(":")[1]?.trim() || "";

      const rating =
        $(element).find(".set").eq(2).text().split(":")[1]?.trim() || "";

      if (title) {
        searchResults.push({
          title,
          anime_id,
          image,
          genres,
          status,
          rating,
        });
      }
    });

    res.send({
      status: true,
      message: "success search anime",
      data: searchResults,
    });
  } catch (error) {
    res.send({
      status: false,
      message: error.message,
    });
  }
};

const getAnimeDetails = async (req, res) => {
  const anime_id = req.params.anime_id;
  const url = `${baseUrl.anime}/anime/${anime_id}`;

  try {
    const data = await fetchData(url, res);
    const $ = cheerio.load(data);

    const main_title = $("h1").text().trim();
    const image = $(".fotoanime img").attr("src");

    let animeInfo = {
      main_title,
      image,
      title: "",
      japanese: "",
      score: "",
      producers: [],
      type: "",
      status: "",
      total_episode: "",
      duration: "",
      release_date: "",
      studios: [],
      genres: [],
      sinopsis: [],
    };

    // Parsing Detail Info
    $(".infozin .infozingle p").each((i, el) => {
      const text = $(el).text().trim();
      if (text.includes("Judul:"))
        animeInfo.title = text.replace("Judul:", "").trim();
      else if (text.includes("Japanese:"))
        animeInfo.japanese = text.replace("Japanese:", "").trim();
      else if (text.includes("Skor:"))
        animeInfo.score = text.replace("Skor:", "").trim();
      else if (text.includes("Tipe:"))
        animeInfo.type = text.replace("Tipe:", "").trim();
      else if (text.includes("Status:"))
        animeInfo.status = text.replace("Status:", "").trim();
      else if (text.includes("Total Episode:"))
        animeInfo.total_episode = text.replace("Total Episode:", "").trim();
      else if (text.includes("Durasi:"))
        animeInfo.duration = text.replace("Durasi:", "").trim();
      else if (text.includes("Tanggal Rilis:"))
        animeInfo.release_date = text.replace("Tanggal Rilis:", "").trim();
      else if (text.includes("Studio:")) {
        animeInfo.studios = text
          .replace("Studio:", "")
          .split(",")
          .map((s) => s.trim());
      } else if (text.includes("Produser:")) {
        animeInfo.producers = text
          .replace("Produser:", "")
          .split(",")
          .map((p) => p.trim());
      } else if (text.includes("Genre:")) {
        // Ambil genre dengan name dan genre_id (slug)
        $(el)
          .find("a")
          .each((idx, genreEl) => {
            const gHref = $(genreEl).attr("href");
            animeInfo.genres.push({
              name: $(genreEl).text().trim(),
              genre_id: gHref ? gHref.split("/")[4] : null,
            });
          });
      }
    });

    // Parsing Sinopsis
    $(".sinopc p").each((i, el) => {
      const pText = $(el).text().trim();
      if (pText) animeInfo.sinopsis.push(pText);
    });

    // Parsing Episode List
    // const episodeList = [];
    // $(".episodelist ul li").each((index, element) => {
    //   const aTag = $(element).find("a");
    //   const episode_title = aTag.text().trim();
    //   const href = aTag.attr("href");
    //   const episode_id = href ? href.split("/")[4] : null;
    //   const episode_date = $(element).find(".zeebr").text().trim();

    //   if (episode_id) {
    //     episodeList.push({ episode_title, episode_id, episode_date });
    //   }
    // });
    // --- PEMISAHAN EPISODE DAN BATCH ---
    const episodeList = [];
    const batchList = [];

    $(".episodelist").each((index, element) => {
      const titleType = $(element).find(".monktit").text().toLowerCase();

      $(element)
        .find("ul li")
        .each((i, li) => {
          const aTag = $(li).find("a");
          const title = aTag.text().trim();
          const href = aTag.attr("href");
          const slug = href ? href.split("/")[4] : null;
          const date = $(li).find(".zeebr").text().trim();

          if (slug) {
            // Jika di judul contain 'batch', masukkan ke batchList
            if (titleType.includes("batch")) {
              batchList.push({
                batch_title: title,
                batch_id: slug,
                uploaded_on: date,
              });
            } else {
              // Selain itu masuk ke episodeList
              episodeList.push({
                episode_title: title,
                episode_id: slug,
                episode_date: date,
              });
            }
          }
        });
    });

    // Parsing Recommended/Related Anime
    const recommendedAnime = [];
    $("#recommend-anime-series .isi-konten").each((i, el) => {
      const title = $(el).find(".judul-anime a").text().trim();
      const poster = $(el).find("img").attr("src");
      const href = $(el).find(".judul-anime a").attr("href");
      const anime_id_ref = href ? href.split("/")[4] : null;

      recommendedAnime.push({
        title,
        poster,
        anime_id: anime_id_ref,
      });
    });

    res.json({
      status: true,
      message: "success get anime details",
      data: {
        ...animeInfo,
        batch_list: batchList,
        episode_list: episodeList,
        recommended_anime: recommendedAnime,
      },
    });
  } catch (error) {
    res.status(500).send({
      status: false,
      message: error.message,
    });
  }
};

let cachedNonce = null;
let nonceTimestamp = 0;
const NONCE_TTL = 30 * 60 * 1000; // 30 menit

const getCachedNonce = async (forceRefresh = false) => {
  const now = Date.now();
  if (forceRefresh || !cachedNonce || (now - nonceTimestamp) > NONCE_TTL) {
    console.log("[Nonce] Refreshing nonce...");
    cachedNonce = await getNonce();
    nonceTimestamp = now;
    console.log("[Nonce] Nonce baru:", cachedNonce);
  }
  return cachedNonce;
};

// Force refresh nonce jika terjadi 403
const invalidateNonce = () => {
  console.log("[Nonce] Invalidating cached nonce karena 403.");
  cachedNonce = null;
  nonceTimestamp = 0;
};

const getAnimeEpisode = async (req, res) => {
  const anime_id = req.params.anime_id; // Ini slug episode
  const url = `${baseUrl.anime}/episode/${anime_id}`;

  try {
    const data = await fetchData(url, res);
    const nonce = await getCachedNonce(); // Mengambil nonce untuk stream-source
    const $ = cheerio.load(data);

    const obj = {
      title: $(".venutama > h1").text().trim(),
      relative: [],
      list_episode: [],
    };

    // 1. Parsing Navigasi (Prev, All, Next)
    $(".flir > a").each((_, element) => {
      const title_ref = $(element).text().trim();
      const href = $(element).attr("href");
      const link_ref = href ? href.split("/")[4] : null;
      if (link_ref) {
        obj.relative.push({ title_ref, link_ref });
      }
    });

    // 2. Parsing Dropdown List Episode
    $("#selectcog > option").each((_, el) => {
      const episode_title = $(el).text().trim();
      const href = $(el).attr("value");
      const episode_id = href ? href.split("/")[4] : null;
      if (episode_id) {
        obj.list_episode.push({ episode_title, episode_id });
      }
    });

    // 3. Parsing Mirror Embed (Stream URL Otomatis)
    obj.mirror_embed1 = {
      quality: "360p",
      mirrors: getStreamingLinks(
        $,
        ".mirrorstream > .m360p > li",
        nonce,
        anime_id,
        "360p",
      ),
    };
    obj.mirror_embed2 = {
      quality: "480p",
      mirrors: getStreamingLinks(
        $,
        ".mirrorstream > .m480p > li",
        nonce,
        anime_id,
        "480p",
      ),
    };
    obj.mirror_embed3 = {
      quality: "720p",
      mirrors: getStreamingLinks(
        $,
        ".mirrorstream > .m720p > li",
        nonce,
        anime_id,
        "720p",
      ),
    };

    // 4. Parsing Download Links (MP4 & MKV)
    const downloadSection = $(".download");
    let downloadLinks = { mp4: {}, mkv: {} };

    if (downloadSection.length) {
      // Cek apakah menggunakan struktur yondarkness atau standar ul
      const isYondarkness = downloadSection.find(".yondarkness-box").length > 0;
      const containers = isYondarkness
        ? downloadSection.find(".yondarkness-box")
        : downloadSection.find("ul");

      containers.each((_, el) => {
        // processDownloadLinks adalah fungsi yang sudah kamu buat sebelumnya
        const processed = processDownloadLinks($, $(el));

        // Gabungkan hasil download links
        if (processed.mp4) {
          Object.assign(downloadLinks.mp4, processed.mp4);
        }
        if (processed.mkv) {
          Object.assign(downloadLinks.mkv, processed.mkv);
        }
      });
    }

    obj.download_links = downloadLinks;

    res.send({
      status: true,
      message: "success get anime episode",
      data: obj,
    });
  } catch (err) {
    res.status(500).send({
      status: false,
      message: err.message,
    });
  }
};

const getBatchAnime = async (req, res) => {
  const batch_id = req.params.batch_id;
  const fullUrl = `${baseUrl.anime}/batch/${batch_id}`;

  try {
    const data = await fetchData(fullUrl, res);
    const $ = cheerio.load(data);

    // Inisialisasi object dengan key yang konsisten dengan getAnimeDetails
    const batchDetails = {
      main_title: $(".jdlrx h1").text().trim(),
      image: $(".imganime img").attr("src"),
      title: "",
      japanese: "",
      score: "",
      producers: [],
      type: "",
      status: "Completed", // Batch biasanya sudah completed
      total_episode: "",
      duration: "",
      release_date: "",
      studios: [],
      genres: [],
      // sinopsis: [],
      // anime_id: $(".totalepisode a").attr("href") ? $(".totalepisode a").attr("href").split("/")[4] : null,
      download_links: [],
    };

    // Parsing Detail Info dari text yang dipisah <br>
    const infoText = $(".infos").html();
    if (infoText) {
      const lines = infoText.split("<br>");
      lines.forEach((line) => {
        const $line = cheerio.load(line);
        const textRaw = $line.text();

        if (textRaw.includes("Judul:")) {
          batchDetails.title = textRaw.replace("Judul:", "").trim();
        } else if (textRaw.includes("Japanese:")) {
          batchDetails.japanese = textRaw.replace("Japanese:", "").trim();
        } else if (textRaw.includes("Rating:") || textRaw.includes("Skor:")) {
          batchDetails.score = textRaw.replace(/(Rating:|Skor:)/, "").trim();
        } else if (
          textRaw.includes("Producers:") ||
          textRaw.includes("Produser:")
        ) {
          batchDetails.producers = textRaw
            .replace(/(Producers:|Produser:)/, "")
            .split(",")
            .map((p) => p.trim());
        } else if (textRaw.includes("Type:") || textRaw.includes("Tipe:")) {
          batchDetails.type = textRaw.replace(/(Type:|Tipe:)/, "").trim();
        } else if (
          textRaw.includes("Episodes:") ||
          textRaw.includes("Total Episode:")
        ) {
          batchDetails.total_episode = textRaw
            .replace(/(Episodes:|Total Episode:)/, "")
            .trim();
        } else if (
          textRaw.includes("Duration:") ||
          textRaw.includes("Durasi:")
        ) {
          batchDetails.duration = textRaw
            .replace(/(Duration:|Durasi:)/, "")
            .trim();
        } else if (
          textRaw.includes("Aired:") ||
          textRaw.includes("Tanggal Rilis:")
        ) {
          batchDetails.release_date = textRaw
            .replace(/(Aired:|Tanggal Rilis:)/, "")
            .trim();
        } else if (
          textRaw.includes("Studios:") ||
          textRaw.includes("Studio:")
        ) {
          batchDetails.studios = textRaw
            .replace(/(Studios:|Studio:)/, "")
            .split(",")
            .map((s) => s.trim());
        } else if (textRaw.includes("Genre:")) {
          $line("a").each((i, el) => {
            const gHref = $(el).attr("href");
            batchDetails.genres.push({
              name: $(el).text().trim(),
              genre_id: gHref ? gHref.split("/")[4] : null,
            });
          });
        }
      });
    }

    // Ambil Sinopsis
    // const sinopsisText = $(".deskripsi").text().replace("Sinopsis:", "").trim();
    // if (sinopsisText) batchDetails.sinopsis.push(sinopsisText);

    // Parsing Download Links
    $(".batchlink li").each((index, element) => {
      const quality = $(element).find("strong").text().trim();
      const links = [];

      $(element)
        .find("a")
        .each((i, el) => {
          const host = $(el).text().trim();
          const link = $(el).attr("href");
          links.push({ host, link });
        });

      if (quality) {
        batchDetails.download_links.push({ quality, links });
      }
    });

    res.json({
      status: true,
      message: "success get batch anime",
      data: batchDetails,
    });
  } catch (error) {
    res.send({
      status: false,
      message: error.message,
    });
  }
};

const getGenreList = async (req, res) => {
  const url = `${baseUrl.anime}/genre-list/`;
  try {
    const data = await fetchData(url, res);
    const $ = cheerio.load(data);

    let genreList = [];

    $(".genres")
      .find("a")
      .each((index, element) => {
        const genre = $(element).text().trim();
        const genre_id = $(element).attr("href").split("/")[2];

        genreList.push({
          genre,
          genre_id,
        });
      });

    res.send({
      status: true,
      message: "success get genre list",
      data: genreList,
    });
  } catch (error) {
    res.send({
      status: false,
      message: error.message,
    });
  }
};

const getGenreDetails = async (req, res) => {
  const genre_id = req.params.genre_id;
  const page = req.params.page || 1;
  const url = `${baseUrl.anime}/genres/${genre_id}/page/${page}`;

  try {
    const data = await fetchData(url, res);
    const $ = cheerio.load(data);

    const animeList = [];

    $(".col-md-4.col-anime-con").each((index, element) => {
      const title = $(element).find(".col-anime-title > a").text().trim();
      const endpoint = $(element).find(".col-anime-title > a").attr("href");
      const anime_id = endpoint ? endpoint.split("/")[4] : null;
      const studio = $(element).find(".col-anime-studio").text().trim();
      const episode = $(element).find(".col-anime-eps").text().trim();
      const rating = $(element).find(".col-anime-rating").text().trim();

      // Mapping Genre: Sekarang menghasilkan name dan genre_id
      const genres = [];
      $(element)
        .find(".col-anime-genre > a")
        .each((i, genreEl) => {
          const gName = $(genreEl).text().trim();
          const gHref = $(genreEl).attr("href");
          const gId = gHref ? gHref.split("/")[4] : null;

          genres.push({
            name: gName,
            genre_id: gId,
          });
        });

      const image = $(element).find(".col-anime-cover > img").attr("src");
      const synopsis = $(element).find(".col-synopsis").text().trim();
      const release_date = $(element).find(".col-anime-date").text().trim();

      animeList.push({
        title,
        anime_id,
        episode,
        rating,
        studio,
        genres,
        image,
        synopsis,
        release_date,
      });
    });

    // --- LOGIKA PAGINATION ---
    const paginationContainer = $(".pagenavix");
    const currentPage =
      parseInt(paginationContainer.find(".page-numbers.current").text()) || 1;

    // Mengambil Max Page dari angka terakhir sebelum tombol "Berikutnya"
    let maxPage = 0;
    paginationContainer.find(".page-numbers").each((i, el) => {
      const pageText = $(el)
        .text()
        .replace(/[^0-9]/g, "");
      if (pageText) {
        const pageNum = parseInt(pageText);
        if (pageNum > maxPage) maxPage = pageNum;
      }
    });

    const hasNextPage =
      paginationContainer.find(".next.page-numbers").length > 0;
    const hasPrevPage =
      paginationContainer.find(".prev.page-numbers").length > 0;

    res.send({
      status: true,
      message: "success get genre details",
      data: animeList,
      pagination: {
        current_page: currentPage,
        max_page: maxPage,
        has_next_page: hasNextPage,
        has_prev_page: hasPrevPage,
      },
    });
  } catch (error) {
    res.send({
      status: false,
      message: error.message,
    });
  }
};

const getScheduleAnime = async (req, res) => {
  const url = `${baseUrl.anime}/jadwal-rilis/`;
  try {
    const data = await fetchData(url, res);
    const $ = cheerio.load(data);

    const scheduleList = [];

    $(".kglist321").each((index, element) => {
      const day = $(element).find("h2").text();
      const animeList = [];

      $(element)
        .find("ul li")
        .each((i, animeItem) => {
          const animeTitle = $(animeItem).find("a").text();
          const anime_id = $(animeItem).find("a").attr("href").split("/")[4];

          animeList.push({
            title: animeTitle,
            anime_id: anime_id,
          });
        });

      scheduleList.push({
        day: day,
        anime: animeList,
      });
    });

    res.send({
      status: true,
      message: "success get schedule anime",
      data: scheduleList,
    });
  } catch (error) {
    res.send({
      status: false,
      message: error.message,
    });
  }
};

const getStreamSource = async (req, res) => {
  const { content } = req.params;
  // Ambil episode_id dari query string
  const { driver, quality, episode_id } = req.query;

  if (!episode_id) {
    return res.status(400).send({
      status: false,
      message: "Parameter 'episode_id' wajib diisi!",
    });
  }

  try {
    // Selalu gunakan nonce dari server (bukan dari client)
    let nonce = await getCachedNonce();

    if (!nonce) {
      return res.status(500).send({
        status: false,
        message: "Gagal mendapatkan nonce dari server sumber.",
      });
    }

    // Teruskan episode_id ke fungsi ekstraksi
    let links = await extractIframeSrc(
      content,
      nonce,
      driver,
      quality,
      episode_id,
    );

    // Jika kena 403, kemungkinan nonce expired. Refresh dan retry sekali.
    if (links && links.errorStatus === 403) {
      console.log("[getStreamSource] 403 detected, refreshing nonce and retrying...");
      invalidateNonce();
      nonce = await getCachedNonce(true);

      if (!nonce) {
        return res.status(500).send({
          status: false,
          message: "Gagal mendapatkan nonce baru setelah refresh.",
        });
      }

      links = await extractIframeSrc(
        content,
        nonce,
        driver,
        quality,
        episode_id,
      );
    }

    if (!links || !links.embed) {
      return res
        .status(404)
        .send({ status: false, message: "Mirror tidak ditemukan untuk driver: " + (driver || 'unknown') });
    }

    res.send({
      status: true,
      message: "success get stream source",
      data: {
        driver: driver,
        quality: quality,
        embed_url: links.embed,
        direct_url: links.direct,
      },
    });
  } catch (error) {
    res.status(500).send({ status: false, message: error.message });
  }
};

module.exports = {
  getOngoingAnime,
  getFinishedAnime,
  getListAnime,
  searchAnime,
  getAnimeDetails,
  getAnimeEpisode,
  getBatchAnime,
  getGenreList,
  getGenreDetails,
  getScheduleAnime,
  getStreamSource,
};
