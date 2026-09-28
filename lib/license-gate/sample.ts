/** Tiny package-lock v3 snippet with one GPL hit for demo. */
export const SAMPLE_PACKAGE_LOCK = `{
  "name": "license-gate-demo",
  "lockfileVersion": 3,
  "requires": true,
  "packages": {
    "": {
      "name": "license-gate-demo",
      "version": "1.0.0"
    },
    "node_modules/lodash": {
      "version": "4.17.21",
      "license": "MIT"
    },
    "node_modules/react": {
      "version": "19.0.0",
      "license": "MIT"
    },
    "node_modules/copyleft-demo": {
      "version": "1.2.3",
      "license": "GPL-3.0"
    },
    "node_modules/unknown-pkg": {
      "version": "0.0.1"
    }
  }
}
`;

export const SAMPLE_FILENAME = "package-lock.json";
