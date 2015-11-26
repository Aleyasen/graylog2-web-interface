'use strict';

import Version = require("./Version");

interface Pages {
    [page: string]: string;
}

class DocsHelper {
    PAGES: Pages = {
        WELCOME: "", // Welcome page to the documentation
        DASHBOARDS: "dashboards.html",
        EXTERNAL_DASHBOARDS: "external_dashboards.html",
        SEARCH_QUERY_LANGUAGE: "queries.html",
        STREAMS: "streams.html"
    };
    DOCS_URL: string = "http://docs.graylog.org/en/";

    toString(path: string): string {
        var baseUrl = this.DOCS_URL + Version.getMajorAndMinorVersion();
        return path === "" ? baseUrl : baseUrl + "/pages/" + path;
    }

    toLink(path: string, title: string): string {
        return "<a href=\"" + this.toString(path) + "\" target=\"_blank\">" + title + "</a>";
    }

    versionedDocsHomePage(): string {
        return this.toString('');
    }
}

var docsHelper = new DocsHelper();

export = docsHelper;
