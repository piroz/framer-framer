# Changelog

## [2.2.0](https://github.com/piroz/framer-framer/compare/v2.1.0...v2.2.0) (2026-03-14)


### Features

* add Flickr oEmbed provider ([7565925](https://github.com/piroz/framer-framer/commit/7565925a866c3b091378945a18e454869377df84))
* add note provider ([7b72564](https://github.com/piroz/framer-framer/commit/7b72564b66d0af962f5bde99c3404ed5930c962e))
* **niconico:** add Niconico oEmbed provider ([b9cc90e](https://github.com/piroz/framer-framer/commit/b9cc90e411bf5ab6395d526bdd55529c02ae98fd))
* **pinterest:** add Pinterest oEmbed provider ([e47992f](https://github.com/piroz/framer-framer/commit/e47992fd16f5bdd114fb65ed0a115c8cfe233c4a))
* **reddit:** add Reddit oEmbed provider ([86ad88e](https://github.com/piroz/framer-framer/commit/86ad88e9123ae871aa9390d170deb6513e447465))
* **slideshare:** add SlideShare oEmbed provider ([#30](https://github.com/piroz/framer-framer/issues/30)) ([dec4ec3](https://github.com/piroz/framer-framer/commit/dec4ec3c3fc6c78a7465df0cad152591fd1c7ed0))
* **speakerdeck:** add Speaker Deck oEmbed provider ([14eaccd](https://github.com/piroz/framer-framer/commit/14eaccddcb7b2a9e94da82aff804c5247f8a082e))

## [2.1.0](https://github.com/piroz/framer-framer/compare/v2.0.0...v2.1.0) (2026-03-13)


### Features

* add built-in LRU cache for embed results ([b7c356a](https://github.com/piroz/framer-framer/commit/b7c356a69a1bc2cd61e3d4ff7b05c222be8cf377))
* add HTML sanitization for oEmbed responses  ([3b967d4](https://github.com/piroz/framer-framer/commit/3b967d4e608a963ffe154318912e79f23c0ceddd))
* add oEmbed auto-discovery for unrecognized URLs ([958d405](https://github.com/piroz/framer-framer/commit/958d40517c3bebce23c6dcc15e436af37b2ac164))

## [2.0.0](https://github.com/piroz/framer-framer/compare/v1.5.0...v2.0.0) (2026-03-10)


### ⚠ BREAKING CHANGES

* **iframe:** `V0Provider`, `v0Provider`, and the `v0()` convenience function have been removed.

### Bug Fixes

* **iframe:** harden sandbox attributes, remove v0 provider ([5037369](https://github.com/piroz/framer-framer/commit/5037369fa6ed3d4d3833596bd52310059e03fc42))

## [1.5.0](https://github.com/piroz/framer-framer/compare/v1.4.0...v1.5.0) (2026-03-10)


### Features

* add AI agent iframe providers (HuggingFace, v0.dev, Gradio)  ([9e7c8fb](https://github.com/piroz/framer-framer/commit/9e7c8fb214e33df67a6851ca5c33f0b49ef5d5b7))

## [1.4.0](https://github.com/piroz/framer-framer/compare/v1.3.0...v1.4.0) (2026-03-09)


### Features

* add EmbedError class for structured error handling ([#5](https://github.com/piroz/framer-framer/issues/5)) ([564c13a](https://github.com/piroz/framer-framer/commit/564c13a6ab3b3e18e6a9d6f1d1202d067c65456d)), closes [#8](https://github.com/piroz/framer-framer/issues/8)
* add retry mechanism with exponential backoff ([54322c8](https://github.com/piroz/framer-framer/commit/54322c8c56711c901435363a2626a18b238e7b9d)), closes [#9](https://github.com/piroz/framer-framer/issues/9)
* improve REST API error responses with code and details fields ([#6](https://github.com/piroz/framer-framer/issues/6)) ([c3eb6a9](https://github.com/piroz/framer-framer/commit/c3eb6a9fc9e2ee6ad2ecc87bab1ab2f5eaba711c)), closes [#12](https://github.com/piroz/framer-framer/issues/12)

## [1.3.0](https://github.com/piroz/framer-framer/compare/v1.2.0...v1.3.0) (2026-03-07)


### Features

* add Hono-based REST API server (framer-framer/server)  ([dbf7d32](https://github.com/piroz/framer-framer/commit/dbf7d329dcf78e6e87998bc1354c210ac927a900))


### Bug Fixes

* trigger initial release-please PR ([cee3746](https://github.com/piroz/framer-framer/commit/cee3746b79c4e56aebeb161220b8f914ea5b8dd6))
