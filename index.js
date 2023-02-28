const fetch = require('node-fetch');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const fs = require('fs')
const { stringify } = require('csv-stringify');

const baseUrl = "http://www.schulliste.eu/type/"
const schoolTypes = [
    "hauptschulen",
];

(async () => {
    /* Iterate over each school type described above */
    await schoolTypes.forEach(async (schoolType) => {
        try {
            const schools = []
            /* Iterate over every available page */
            for (let pageIndex = 0; pageIndex < 1000000; pageIndex++) {

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
                        const res = await fetch(school.url)
                        const html = await res.text()
                        const dom = new JSDOM(html)

                        const addressContainer = dom.window.document.querySelector("[itemprop=address]")
                        const street = addressContainer.querySelectorAll("span").item(0).innerHTML
                        const zipCode = addressContainer.querySelectorAll("span").item(1).innerHTML
                        
                        const city = addressContainer.querySelectorAll("span").item(2).innerHTML

                        const mailContainerHtml = dom.window.document.querySelector(".my_modal_open").innerHTML
                        const mail = mailContainerHtml.replace(/.(img.+>)/, "@")

                        const phone = dom.window.document.querySelector("[itemprop=telephone]").textContent
               
                        return {
                            ...school,
                            street,
                            zipCode,
                            city,
                            mail,
                            phone
                        }
                    })
                    schools.push(...await Promise.all(detailedSchoolsObj))
                } catch (e) {
                    console.log(schools)
                    console.log("End of Pages on Page #" + (pageIndex + 1))
                    stringify(schools, {
                        header: true
                    }, function (err, output) {
                        console.log(err)
                        fs.writeFile('hauptschulen.csv', output, {}, () => true);
                    })
                }
            }
            stringify(schools, {
                header: true
            }, function (err, output) {
                console.log(err)
                fs.writeFile('hauptschulen.csv', output, {}, () => true);
            })
        } catch (error) {
            console.log(error)
        }

    })

})();