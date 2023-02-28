const fetch = require('node-fetch');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const fs = require('fs')
const { stringify } = require('csv-stringify');

const baseUrl = "http://www.schulliste.eu/type/"
const schoolTypes = [
    "gesamtschulen",
];
const pageCount = 32;

(async () => {
    /* Iterate over each school type described above */
    await schoolTypes.forEach(async (schoolType) => {
        try {
            const schools = []
            /* Iterate over every available page */
            for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
                console.log("Scraping Page #" + (pageIndex + 1) + " - " + "∑ " + (pageIndex + 1) * 20 + " Schools")

                let url = baseUrl + schoolType + '/'
                if (pageIndex > 0) url += `?bundesland=&start=${20 * pageIndex}`

                try {
                    const res = await fetch(url)
                    const html = await res.text()

                    const dom = new JSDOM(html)

                    const schoolDivArr = dom.window.document.querySelectorAll(".doc_entry")

                    const simpleSchoolsObj = []
                    schoolDivArr.forEach((schoolDiv, i) => {
                        const descriptionDiv = schoolDiv.getElementsByClassName("doc_entry_desc").item(0)
                        const nameDiv = descriptionDiv.getElementsByClassName("school_name").item(0)

                        const schoolViewHref = nameDiv.getElementsByClassName("red").item(0).getAttribute("href")

                        simpleSchoolsObj.push({
                            name: nameDiv.textContent,
                            url: schoolViewHref
                        })
                    })

                    const detailedSchoolsObj = await simpleSchoolsObj.map(async (school) => {
                        try {
                            const res = await fetch(school.url)
                            const html = await res.text()
                            const dom = new JSDOM(html)

                            const addressContainer = dom.window.document.querySelector("[itemprop=address]")
                            const street = addressContainer.querySelectorAll("span").item(0).innerHTML
                            const zipCode = addressContainer.querySelectorAll("span").item(1).innerHTML

                            const city = addressContainer.querySelectorAll("span").item(2).innerHTML

                            const mailContainerHtml = dom.window.document.querySelector(".my_modal_open")
                            const mail = mailContainerHtml ? mailContainerHtml.innerHTML.replace(/.(img.+>)/, "@") : ""

                            const phoneContainer = dom.window.document.querySelector("[itemprop=telephone]")
                            const phone = phoneContainer ? phoneContainer.textContent : ""

                            return {
                                ...school,
                                street,
                                zipCode,
                                city,
                                mail,
                                phone
                            }
                        } catch (error) {
                            console.log("Error while fetching single School: " + school.name + ", " + school.url + " - " + error)
                        }

                    })
                    schools.push(...await Promise.all(detailedSchoolsObj))

                    stringify(schools, {
                        header: true
                    }, function (err, output) {
                        err && console.log(err)
                        fs.writeFile(`${schoolType}.csv`, output, {}, () => true);
                    })
                } catch (e) {
                    console.log("Error while fetching on Page #" + (pageIndex + 1) + " " + error)
                }
            }
        } catch (error) {
            console.log(error)
        }

    })

})();