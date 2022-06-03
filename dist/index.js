"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const picocolors_1 = __importDefault(require("picocolors"));
const vite_1 = require("vite");
/**
 * Laravel plugin for Vite.
 *
 * @param config - A config object or relative path(s) of the scripts to be compiled.
 */
function laravel(config) {
    const pluginConfig = resolvePluginConfig(config);
    let viteDevServerUrl;
    let resolvedConfig;
    const ziggy = 'vendor/tightenco/ziggy/dist/index.es.js';
    const defaultAliases = {
        ...(fs_1.default.existsSync(ziggy) ? { ziggy } : undefined),
        '@': '/resources/js',
    };
    return {
        name: 'laravel',
        enforce: 'post',
        config: (userConfig, { command, mode }) => {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
            const ssr = !!((_a = userConfig.build) === null || _a === void 0 ? void 0 : _a.ssr);
            const env = (0, vite_1.loadEnv)(mode, process.cwd(), '');
            const assetUrl = (_b = env.ASSET_URL) !== null && _b !== void 0 ? _b : '';
            return {
                base: command === 'build' ? resolveBase(pluginConfig, assetUrl) : '',
                publicDir: false,
                build: {
                    manifest: !ssr,
                    outDir: (_d = (_c = userConfig.build) === null || _c === void 0 ? void 0 : _c.outDir) !== null && _d !== void 0 ? _d : resolveOutDir(pluginConfig, ssr),
                    rollupOptions: {
                        input: (_g = (_f = (_e = userConfig.build) === null || _e === void 0 ? void 0 : _e.rollupOptions) === null || _f === void 0 ? void 0 : _f.input) !== null && _g !== void 0 ? _g : resolveInput(pluginConfig, ssr)
                    },
                },
                server: {
                    origin: '__laravel_vite_placeholder__',
                    ...(process.env.LARAVEL_SAIL ? {
                        host: '0.0.0.0',
                        port: env.VITE_PORT ? parseInt(env.VITE_PORT) : 5173,
                        strictPort: true,
                    } : undefined)
                },
                resolve: {
                    alias: Array.isArray((_h = userConfig.resolve) === null || _h === void 0 ? void 0 : _h.alias)
                        ? [
                            ...(_k = (_j = userConfig.resolve) === null || _j === void 0 ? void 0 : _j.alias) !== null && _k !== void 0 ? _k : [],
                            ...Object.keys(defaultAliases).map(alias => ({
                                find: alias,
                                replacement: defaultAliases[alias]
                            }))
                        ]
                        : {
                            ...defaultAliases,
                            ...(_l = userConfig.resolve) === null || _l === void 0 ? void 0 : _l.alias,
                        }
                }
            };
        },
        configResolved(config) {
            resolvedConfig = config;
        },
        transform(code) {
            if (resolvedConfig.command === 'serve') {
                return code.replace(/__laravel_vite_placeholder__/g, viteDevServerUrl);
            }
        },
        configureServer(server) {
            var _a;
            const hotFile = path_1.default.join(pluginConfig.publicDirectory, 'hot');
            (_a = server.httpServer) === null || _a === void 0 ? void 0 : _a.once('listening', () => {
                var _a;
                const address = (_a = server.httpServer) === null || _a === void 0 ? void 0 : _a.address();
                const isAddressInfo = (x) => typeof x === 'object';
                if (isAddressInfo(address)) {
                    const protocol = server.config.server.https ? 'https' : 'http';
                    const host = address.family === 'IPv6' ? `[${address.address}]` : address.address;
                    viteDevServerUrl = `${protocol}://${host}:${address.port}`;
                    fs_1.default.writeFileSync(hotFile, viteDevServerUrl);
                    const appUrl = (0, vite_1.loadEnv)('', process.cwd(), 'APP_URL').APP_URL;
                    setTimeout(() => {
                        server.config.logger.info(picocolors_1.default.red(`\n  Laravel ${laravelVersion()} `));
                        server.config.logger.info(`\n  > APP_URL: ` + picocolors_1.default.cyan(appUrl));
                    });
                }
            });
            const clean = () => {
                if (fs_1.default.existsSync(hotFile)) {
                    fs_1.default.rmSync(hotFile);
                }
                process.exit();
            };
            process.on('exit', clean);
            process.on('SIGHUP', clean);
            process.on('SIGINT', clean);
            process.on('SIGTERM', clean);
        }
    };
}
exports.default = laravel;
/**
 * The version of Laravel being run.
 */
function laravelVersion() {
    var _a, _b, _c;
    try {
        const composer = JSON.parse(fs_1.default.readFileSync('composer.lock').toString());
        return (_c = (_b = (_a = composer.packages) === null || _a === void 0 ? void 0 : _a.find((composerPackage) => composerPackage.name === 'laravel/framework')) === null || _b === void 0 ? void 0 : _b.version) !== null && _c !== void 0 ? _c : '';
    }
    catch {
        return '';
    }
}
/**
 * Convert the users configuration into a standard structure with defaults.
 */
function resolvePluginConfig(config) {
    var _a, _b, _c, _d, _e;
    if (typeof config === 'undefined' || typeof config === 'string' || Array.isArray(config)) {
        config = { input: config, ssr: config };
    }
    if (typeof config.publicDirectory === 'string') {
        config.publicDirectory = config.publicDirectory.trim().replace(/^\/+/, '');
        if (config.publicDirectory === '') {
            throw new Error('publicDirectory must be a subdirectory. E.g. \'public\'.');
        }
    }
    if (typeof config.buildDirectory === 'string') {
        config.buildDirectory = config.buildDirectory.trim().replace(/^\/+/, '').replace(/\/+$/, '');
        if (config.buildDirectory === '') {
            throw new Error('buildDirectory must be a subdirectory. E.g. \'build\'.');
        }
    }
    if (typeof config.ssrOutputDirectory === 'string') {
        config.ssrOutputDirectory = config.ssrOutputDirectory.trim().replace(/^\/+/, '').replace(/\/+$/, '');
    }
    return {
        input: (_a = config.input) !== null && _a !== void 0 ? _a : 'resources/js/app.js',
        publicDirectory: (_b = config.publicDirectory) !== null && _b !== void 0 ? _b : 'public',
        buildDirectory: (_c = config.buildDirectory) !== null && _c !== void 0 ? _c : 'build',
        ssr: (_d = config.ssr) !== null && _d !== void 0 ? _d : 'resources/js/ssr.js',
        ssrOutputDirectory: (_e = config.ssrOutputDirectory) !== null && _e !== void 0 ? _e : 'storage/ssr',
    };
}
/**
 * Resolve the Vite base option from the configuration.
 */
function resolveBase(config, assetUrl) {
    return assetUrl + (!assetUrl.endsWith('/') ? '/' : '') + config.buildDirectory + '/';
}
/**
 * Resolve the Vite input path from the configuration.
 */
function resolveInput(config, ssr) {
    var _a;
    if (ssr) {
        return (_a = config.ssr) !== null && _a !== void 0 ? _a : config.input;
    }
    return config.input;
}
/**
 * Resolve the Vite outDir path from the configuration.
 */
function resolveOutDir(config, ssr) {
    if (ssr) {
        return config.ssrOutputDirectory;
    }
    return path_1.default.join(config.publicDirectory, config.buildDirectory);
}
