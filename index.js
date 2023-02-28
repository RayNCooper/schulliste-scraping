const fetch = require('node-fetch');
const jsdom = require("jsdom");
const fs = require('fs')

const baseUrl = "http://www.schulliste.eu/type/"
const schoolTypes = [
    "hauptschulen",
]

const { JSDOM } = jsdom;

(async () => {
    await schoolTypes.forEach(async (schoolType) => {
        try {
            const res = await fetch(baseUrl + schoolType + '/')
            const html = await res.text()
            console.log(html)
            console.log(schoolType)

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
                const zip = addressContainer.querySelectorAll("span").item(1).innerHTML
                const city = addressContainer.querySelectorAll("span").item(2).innerHTML

                const mailContainerHtml = dom.window.document.querySelector(".my_modal_open").innerHTML
                const mail = mailContainerHtml.replace(/.(img.+>)/, "@")

                const phone = dom.window.document.querySelector("[itemprop=telephone]").textContent

                return {
                    ...school,
                    street,
                    zip,
                    city,
                    mail,
                    phone
                }
            })
            console.log(await Promise.all(detailedSchoolsObj))
        } catch (e) {
            console.log(e)
        }
    })

})();