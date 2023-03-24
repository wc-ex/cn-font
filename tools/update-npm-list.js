// 搜索NPM，获取和更新字体列表
const child_process = require("child_process");
const axios = require("axios");
const path = require("path");
const fs = require("fs");

// const ret = child_process.execSync(
//   `npm -registry "https://registry.npmjs.org/"  search --prefer-online --no-description --json "cn-fontsource-"`,
//   { stdio: "pipe", encoding: "utf8" }
// );

/** @type string[] */
// let jsonPkg = JSON.parse(ret);

/**
 * 成功返回最新包信息，失败返回undefined
 */
async function checkNpmPkg(pkgName) {
  try {
    let ret = await axios.get(`https://registry.npmjs.com/${pkgName}`, {
      responseType: "json",
      validateStatus(status) {
        return status < 500;
      },
    });
    if (ret.status == 200) {
      let ver = ret.data["dist-tags"].latest;
      let info = ret.data.versions[ver];
      console.log(ret.data.name, ver, info.font.type);
      if (!info.font) {
        console.log("==> Error no font field:", pkgName, "\n");
        return undefined;
      }
      if (["opensource", "free", "paid"].indexOf(info.font.type) < 0) {
        console.log("==> Error font type:", pkgName, info.font.type, "\n");
        return undefined;
      }

      return info;
    }
  } catch (e) {
    console.log("==> ", pkgName, "Error:", e.message, "\n");
  }

  return undefined;
}

(async () => {
  // 搜索npm包
  let ret = {};
  try {
    ret = await axios.get("https://registry.npmjs.com/-/v1/search?text=cn-fontsource-&size=250", {
      responseType: "json",
      validateStatus(status) {
        return status < 500;
      },
    });
  } catch (e) {
    console.log("Error: ", e.message);
    process.exit(0);
  }

  // console.log(ret)
  // let jsonPkg = ret;

  // 获取有效包
  let validPkgs = [];
  for (let p of ret.data.objects) {
    // 获取详细包信息
    let ret = await checkNpmPkg(p.package.name);
    if (ret) validPkgs.push(ret);
  }
  // 分类
  let free = [],
    paid = [],
    opensource = [];
  for (let p of validPkgs) {
    switch (p.font.type) {
      case "free":
        free.push(p);
        break;
      case "opensource":
        opensource.push(p);
        break;
      case "paid":
        paid.push(p);
        break;
    }
  }
  opensource.sort((a, b) => (a.name == b.name ? 0 : a.name < b.name? -1 : 1));
  free.sort((a, b) => (a.name == b.name ? 0 : a.name < b.name? -1 : 1));
  paid.sort((a, b) => (a.name == b.name ? 0 : a.name < b.name? -1 : 1));
  //
  let str = `### 开源字体: ${opensource.length}\n`;
  for (let p of opensource) {
    str += `<p align="center"><h4><a href="https://www.npmjs.com/package/${p.name}">${p.name}</a></h4><a href="https://www.npmjs.com/package/${p.name}"><img src="https://cdn.jsdelivr.net/npm/${p.name}@${p.version}/font.png" alt="${p.name}"></a></p>\n`;
  }
  // ==== free
  str += `\n### 免费字体: ${free.length}\n`;
  for (let p of free) {
    str += `<p align="center"><h4><a href="https://www.npmjs.com/package/${p.name}">${p.name}</a></h4><a href="https://www.npmjs.com/package/${p.name}"><img src="https://cdn.jsdelivr.net/npm/${p.name}@${p.version}/font.png" alt="${p.name}"></a></p>\n`;
  }
  //=== paid
  str += `\n### 商业字体: ${paid.length}\n`;
  for (let p of paid) {
    str += `<p align="center"><h4><a href="https://www.npmjs.com/package/${p.name}">${p.name}</a></h4><a href="https://www.npmjs.com/package/${p.name}"><img src="https://cdn.jsdelivr.net/npm/${p.name}@${p.version}/font.png" alt="${p.name}"></a></p>\n`;
  }

  // 更新README

  let readme = fs.readFileSync(path.join(__dirname, "../README.md"), "utf8");
  let newReadme = readme.replace(/<!--@LIST-->[\s\S]*$/g, "<!--@LIST-->\n" + str);

  // console.log(newReadme);
  fs.writeFileSync(path.join(__dirname, "../README.md"), newReadme, "utf8");

  fs.writeFileSync(
    path.join(__dirname, "../cn-fontsource-list.json"),
    JSON.stringify({ free, paid, opensource }, null, 2),
    "utf8"
  );
  // 更新版本
  let pkgJson =JSON.parse(fs.readFileSync(path.join(__dirname,'../package.json'),'utf-8'));
  let sp = pkgJson.version.split('.').map(v=>parseInt(v))
  sp[2]++;
  pkgJson.version = sp.join('.');
  console.log("new version:",pkgJson.version);
  fs.writeFileSync(path.join(__dirname,'../package.json'),JSON.stringify(pkgJson,null,2),'utf-8');

})();
