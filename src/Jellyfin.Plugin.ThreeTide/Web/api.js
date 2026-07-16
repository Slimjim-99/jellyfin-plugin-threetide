(() => {
    "use strict";

    const root = window.ThreeTide =
        window.ThreeTide || {};

    const DEFAULT_TIMEOUT_MS = 20000;

    function getApiClient() {
        if (
            typeof ApiClient !== "undefined" &&
            ApiClient
        ) {
            return ApiClient;
        }

        return window.ApiClient || null;
    }

    function getCurrentUserId() {
        return getApiClient()
            ?.getCurrentUserId?.() || "";
    }

    function getAccessToken() {
        const client = getApiClient();

        return (
            client?.accessToken?.() ||
            client?._serverInfo?.AccessToken ||
            ""
        );
    }

    function getServerAddress() {
        const client = getApiClient();

        const address =
            client?.serverAddress?.() ||
            client?._serverInfo?.ManualAddress ||
            client?._serverInfo?.LocalAddress ||
            window.location.origin;

        return String(address || window.location.origin)
            .replace(/\/+$/, "");
    }

    function buildUrl(path, query = null) {
        const normalizedPath =
            String(path || "")
                .replace(/^\/+/, "");

        const url = new URL(
            `${getServerAddress()}/${normalizedPath}`
        );

        if (query && typeof query === "object") {
            Object.entries(query).forEach(
                ([key, value]) => {
                    if (
                        value === undefined ||
                        value === null ||
                        value === ""
                    ) {
                        return;
                    }

                    url.searchParams.set(
                        key,
                        String(value)
                    );
                }
            );
        }

        return url.toString();
    }

    async function request(
        path,
        options = {}
    ) {
        const {
            method = "GET",
            query = null,
            body = undefined,
            headers = {},
            timeoutMs = DEFAULT_TIMEOUT_MS,
            signal = null
        } = options;

        const controller =
            new AbortController();

        const timeout =
            window.setTimeout(
                () => controller.abort(),
                timeoutMs
            );

        let externalAbortHandler = null;

        if (signal) {
            if (signal.aborted) {
                controller.abort();
            } else {
                externalAbortHandler = () => {
                    controller.abort();
                };

                signal.addEventListener(
                    "abort",
                    externalAbortHandler,
                    {
                        once: true
                    }
                );
            }
        }

        const token = getAccessToken();

        const requestHeaders = {
            Accept: "application/json",
            ...headers
        };

        if (token) {
            requestHeaders["X-Emby-Token"] =
                token;
        }

        if (
            body !== undefined &&
            body !== null &&
            !(
                body instanceof FormData
            )
        ) {
            requestHeaders["Content-Type"] =
                "application/json";
        }

        try {
            const response = await fetch(
                buildUrl(path, query),
                {
                    method,
                    headers: requestHeaders,
                    body:
                        body === undefined ||
                            body === null
                            ? undefined
                            : body instanceof FormData
                                ? body
                                : JSON.stringify(body),
                    credentials: "same-origin",
                    signal: controller.signal
                }
            );

            const text =
                await response.text();

            let data = null;

            if (text) {
                try {
                    data = JSON.parse(text);
                } catch {
                    data = text;
                }
            }

            if (!response.ok) {
                const message =
                    data?.message ||
                    data?.Message ||
                    (
                        typeof data === "string"
                            ? data
                            : ""
                    ) ||
                    `HTTP ${response.status}`;

                const error = new Error(message);

                error.name =
                    "ThreeTideApiError";

                error.status =
                    response.status;

                error.response =
                    data;

                throw error;
            }

            return data;
        } catch (error) {
            if (
                error?.name ===
                "AbortError"
            ) {
                throw new Error(
                    "Die Anfrage hat zu lange gedauert."
                );
            }

            throw error;
        } finally {
            window.clearTimeout(timeout);

            if (
                signal &&
                externalAbortHandler
            ) {
                signal.removeEventListener(
                    "abort",
                    externalAbortHandler
                );
            }
        }
    }

    async function getJellyfinItems(
        parameters = {}
    ) {
        const client =
            getApiClient();

        const userId =
            getCurrentUserId();

        if (!client || !userId) {
            throw new Error(
                "Jellyfin-Benutzer oder ApiClient ist nicht verfügbar."
            );
        }

        if (
            typeof client.getItems ===
            "function"
        ) {
            const response =
                await client.getItems(
                    userId,
                    parameters
                );

            return response?.Items || [];
        }

        const response = await request(
            `Users/${encodeURIComponent(userId)}/Items`,
            {
                query: parameters
            }
        );

        return response?.Items || [];
    }

    const Api = {
        init() {
            console.info(
                "[3Tide] API-Modul initialisiert."
            );

            return this;
        },

        get client() {
            return getApiClient();
        },

        get userId() {
            return getCurrentUserId();
        },

        get serverAddress() {
            return getServerAddress();
        },

        request,

        jellyfin: {
            getItems:
                getJellyfinItems,

            getLatest(
                mediaType,
                limit = 20
            ) {
                return getJellyfinItems({
                    Recursive: true,
                    IncludeItemTypes:
                        mediaType,
                    SortBy:
                        "DateCreated,PremiereDate",
                    SortOrder:
                        "Descending",
                    Limit:
                        Math.max(1, limit),
                    Fields:
                        "Overview,Genres,ProductionYear," +
                        "CommunityRating,PrimaryImageTag," +
                        "PrimaryImageAspectRatio," +
                        "BackdropImageTags,UserData",
                    ImageTypeLimit: 1,
                    EnableImages: true,
                    EnableUserData: true
                });
            },

            getLatestMovies(
                limit = 20
            ) {
                return this.getLatest(
                    "Movie",
                    limit
                );
            },

            getLatestSeries(
                limit = 20
            ) {
                return this.getLatest(
                    "Series",
                    limit
                );
            },

            search(
                term,
                limit = 30
            ) {
                const query =
                    String(term || "")
                        .trim();

                if (query.length < 2) {
                    return Promise.resolve([]);
                }

                return getJellyfinItems({
                    Recursive: true,
                    SearchTerm: query,
                    IncludeItemTypes:
                        "Movie,Series,Episode",
                    Limit:
                        Math.max(1, limit),
                    Fields:
                        "Overview,Genres,ProductionYear," +
                        "CommunityRating,PrimaryImageTag," +
                        "BackdropImageTags,UserData",
                    ImageTypeLimit: 1,
                    EnableImages: true,
                    EnableUserData: true
                });
            },

            getById(itemId) {
                const userId =
                    getCurrentUserId();

                if (!userId || !itemId) {
                    throw new Error(
                        "Benutzer oder Medien-ID fehlt."
                    );
                }

                return request(
                    `Users/${encodeURIComponent(userId)}/Items/${encodeURIComponent(itemId)}`
                );
            },

            getPrimaryImageUrl(
                item,
                maxWidth = 500
            ) {
                const client =
                    getApiClient();

                if (
                    !client ||
                    !item?.Id ||
                    !item?.PrimaryImageTag
                ) {
                    return "";
                }

                return client.getUrl(
                    `Items/${item.Id}/Images/Primary`,
                    {
                        tag:
                            item.PrimaryImageTag,
                        maxWidth,
                        quality: 90
                    }
                );
            },

            getBackdropUrl(
                item,
                maxWidth = 1920
            ) {
                const client =
                    getApiClient();

                if (
                    !client ||
                    !item?.Id
                ) {
                    return "";
                }

                const ownBackdrop =
                    item.BackdropImageTags?.[0];

                const parentBackdrop =
                    item.ParentBackdropImageTags?.[0];

                const imageItemId =
                    ownBackdrop
                        ? item.Id
                        : item.ParentBackdropItemId ||
                        item.Id;

                const tag =
                    ownBackdrop ||
                    parentBackdrop;

                if (!tag) {
                    return "";
                }

                return client.getUrl(
                    `Items/${imageItemId}/Images/Backdrop/0`,
                    {
                        tag,
                        maxWidth,
                        quality: 90
                    }
                );
            }
        },

        seerr: {
            status() {
                return request(
                    "ThreeTide/Seerr/Status"
                );
            },

            trending(
                mediaType = "all",
                page = 1
            ) {
                return request(
                    "ThreeTide/Seerr/Trending",
                    {
                        query: {
                            mediaType,
                            page:
                                Math.max(1, page)
                        }
                    }
                );
            },

            search(
                term,
                page = 1
            ) {
                const query =
                    String(term || "")
                        .trim();

                if (query.length < 2) {
                    return Promise.resolve({
                        page: 1,
                        totalPages: 0,
                        totalResults: 0,
                        results: []
                    });
                }

                return request(
                    "ThreeTide/Seerr/Search",
                    {
                        query: {
                            query,
                            page:
                                Math.max(1, page)
                        }
                    }
                );
            }
        }
    };

    root.Api = Api;
})();