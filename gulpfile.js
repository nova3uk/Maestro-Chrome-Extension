import gulp from 'gulp';
import zip from 'gulp-zip';
import fs from 'fs/promises';

let manifest = JSON.parse(await fs.readFile("manifest.json"));
let currentVersion = manifest.version;

function build(callback) {
    gulp
        .src(["src/**", "_locales/**", "manifest.json", "README.md", "LICENSE"], { base: "." })
        .pipe(zip("maestro-extension-." + currentVersion + ".zip"))
        .pipe(gulp.dest("deployments"));

    callback();
}

gulp.task("build", build);