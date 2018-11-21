/*
js/twLanguagesEdu.js
*/
var width = 500,
    height = 600;
var centerCoordinates = [122,23.85];
var projection = d3.geoMercator()
    //.precision(.1)
    .center(centerCoordinates)
    .scale(9000);
    
var path = d3.geoPath()
    .projection(projection);

var svg = d3.select("#taiwan").append("svg")
    .attr("width", width)
    .attr("height", height);

var school_tip = d3.select("#taiwan").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

var timeslot_ul = d3.select("#timeslots");

// load Taiwan
d3.json("json/twCounty2010merge.topo.json").then(function(twcounties) {
    svg.append("g")
        .attr("class", "counties")
        .selectAll("path")
        .data(topojson.feature(twcounties, twcounties.objects.layer1).features)
        .enter().append("path")
        .attr("d", path);

    svg.append("path")
        .attr("class", "county-borders")
        .attr("d", path(topojson.mesh(twcounties, twcounties.objects.layer1, function(a, b) { return a !== b; })));
});

// load schools
d3.json("json/language_co_learn1114.json").then(function(data) {
    // remap data based on timeslots
    var timeslots = d3.nest()
        .key(function(d){return d.選習時段;})
        .entries(data)
        .map(function(d){
            return {
                timeslot: d.key,
                values: d.values.map(function(d){
                    return{
                        sno: d.學校編號,
                        gno: d.共學組編號,
                        sch_name: d.學校名稱,
                        language: d.族語方言,
                        class_no: d.虛擬教室號碼,
                        teacher: d.族語教師,
                        start_dt: d.開播日期,
                        host_sch: d.主辦學校,
                        host_area: d.主播區域,
                        host_loc: d.主播地點,
                        stu_no: d.學生編號,
                        stu_grad: d.年級
                    };
                })
            }
        })
        .sort(function(x, y){
            return d3.ascending(x.timeslot.slice(0,2), y.timeslot.slice(0,2));
        });
    
    var schools = d3.nest()
        .key(function(d){return d.學校名稱;})
        .entries(data)
        .map(function(d){
            return {
                sch_name: d.key,
                sno: "sno"+d.values[0].學校編號,
                Lat: d.values[0].Lat,
                Lng: d.values[0].Lng,
                // groupping based on gno
                groups: d3.nest()
                    .key(function(d){ return d.共學組編號;} )
                    .entries(d.values)
                    .map(function(d){
                        return "gno"+d.key;
                    }),
                // groupping based on timeslot
                timeslots: d3.nest()
                    .key(function(d){ return d.選習時段;} )
                    .entries(d.values)
                    .map(function(d){
                        return "tno"+d.key.slice(0,2);
                    })
            };
        });
    // some other data for stats
    var nteachers = d3.nest()
        .key(function(d){return d.族語教師;})
        .entries(data)
        .length;
    var nlangs = d3.nest()
        .key(function(d){return d.族語方言;})
        .entries(data)
        .length;
    var ngroups = d3.nest()
        .key(function(d){return d.共學組編號;})
        .entries(data)
        .length;
    var ncounties = d3.nest()
        .key(function(d){return d.縣市;})
        .entries(data)
        .length;
    // 
    d3.select("#info-panel")
        .append("div")
        .classed("row", true)
        .classed("proj-title", true)
        .html(`
            <div class="col-12">
                <h1>107&nbsp學年度<br>原住民族族語<br>直播共學系統</h1>
            </div>
        `);
    // show project stats
    d3.select("#info-panel")
        .append("div")
        .classed("row", true)
        .classed("mt-3", true)
        .classed("proj-info", true)
        .html(`
            <div class="col-12">
                <h2>計畫執行現況</h2><br>
                <p><span>`+data.length+`</span>&nbsp位學生</p>
                <p><span>`+schools.length+`</span>&nbsp所中小學</p>
                <p><span>`+ngroups+`</span>&nbsp個共學組</p>
                <p><span>`+nteachers+`</span>&nbsp位族語教師</p>
                <p><span>`+nlangs+`</span>&nbsp種語言</p>
                <p><span>`+ncounties+`</span>&nbsp縣市</p>
                <p><span>`+timeslots.length+`</span>&nbsp選習時段</p>
            </div>`
    );

    // draw tw map and plot school locations
    svg.append("g")
        .attr("class", "schools")
        .selectAll("g")
        .data(schools)
        .enter()
        .append("g")
        .attr("transform", function(d) { return "translate(" + projection([d.Lng, d.Lat]) + ")"; })
        .append("circle")
        .attr("class", function(d){ return d.sno;})
        .attr("class", function(d){ return d3.select(this).attr("class")+" "+d.groups.join(" ");}) // adding classes for group
        .attr("class", function(d){ return d3.select(this).attr("class")+" "+d.timeslots.join(" ");}) // adding classes for timeslot
        .attr("r", 2) //radius of the point you have added
        .on("mouseover", function(d, i) {
            d3.select(this).attr("r", 5);
            // tooltip's text and position
            school_tip
                .html(d.sch_name)
                .style("left", (d3.event.pageX - document.getElementById('taiwan').offsetLeft+5) + "px")
                .style("top", (d3.event.pageY - document.getElementById('taiwan').offsetTop-28) + "px");
            // tooltip fade in
            school_tip
                .transition()
                .duration(200)
                .style("opacity", .9);
        })
        .on("mouseout", function() { 
            d3.select(this).attr("r", 2);
            // tooltip fade out
            school_tip
                .transition()
                .duration(500)
                .style("opacity", 0);
        });
    
    // render dynamic legends and handle mouse hover and click events
    timeslot_ul.selectAll("li:not(.lable)")
        .data(timeslots)
        .enter().append("li")
        .attr("id", function(d){ return "t_"+d.timeslot;})
        .attr("class", "nav-item")
        .html(function(d){
            return '<a class="nav-link">'+d.timeslot.slice(3,5)+'<br/>'+d.timeslot.slice(5)+'</a>';
        })
        .on("mouseover", function(d, i){
            // select all active schools in given timeslot
            d3.selectAll(".tno"+d.timeslot.slice(0,2))
                .classed("ts-hover", true)
                .attr("r", 5);
        })
        .on("mouseout", function(d, i) { 
            d3.selectAll(".tno"+d.timeslot.slice(0,2))
                .classed("ts-hover", false)
                .attr("r", 2);
        })
        .on("click", click_timeslot);
});

// when a timeslot is clicked
function click_timeslot(d, i){
    // remove previous result
    d3.select("#groups").selectAll("li:not(.lable)").remove();
    d3.select("#info-panel").selectAll("div.group-info").remove();
    // show basic project stats
    d3.select("#info-panel").select("div.proj-info").classed("d-none", false);

    var tgt = d3.select(this);
    var tgt_changed = !tgt.classed("active");
    // deactive all active timeslots and groups
    d3.selectAll("li.active").classed("active", false);
    // remove all ts/gp-deactive class
    d3.selectAll("circle")
        .classed("ts-deactive", false)
        .classed("gp-deactive", false);
    if (tgt_changed) {
        // active ts on nav
        tgt.classed("active", true);
        // mark other circles "ts-deactivated"
        d3.selectAll("circle:not(.tno"+d.timeslot.slice(0,2)+")")
            .classed("ts-deactive", true);
        // co-learning groups in the given timeslot 
        var groups = d3.nest()
            .key(function(d){return d.gno;})
            .entries(d.values)
            .map(function(d){
                return {
                    gno: d.key,
                    language: d.values[0].language,
                    class_no: d.values[0].class_no,
                    teacher: d.values[0].teacher,
                    start_dt: d.values[0].start_dt,
                    host_sch: d.values[0].host_sch,
                    host_area: d.values[0].host_area,
                    host_loc: d.values[0].host_loc,
                    // group schools
                    schools: d3.nest()
                        .key(function(d){return d.sno;})
                        .entries(d.values)
                        .map(function(d){
                            return {
                                sno: d.key,
                                sch_name: d.values[0].sch_name,
                                students: d.values.map(function(d){
                                    return {
                                        stu_no: d.stu_no,
                                        stu_grad: d.stu_grad
                                    };
                                })
                            };
                        })
                };
            });
        // show generated groups on the second row
        d3.select("#groups")
            .selectAll("li:not(.lable)")
            .data(groups)
            .enter().append("li")
            .attr("class", "nav-item px-2")
            .html(function(d){
                return '<a class="nav-link">'+d.gno+'</a>';
            })
            .on("mouseover", function(d, i){
                d3.selectAll("circle.gno"+d.gno)
                    .classed("gp-hover", true)
                    .attr("r", 5);
            })
            .on("mouseout", function(d, i){
                d3.selectAll("circle.gno"+d.gno)
                    .classed("gp-hover", false)
                    .attr("r", 2);
            })
            .on("click", click_group);
    }
}

// when a co-learning group is clicked
function click_group(d, i){
    // remove previous school info result
    d3.select("#info-panel").selectAll("div.group-info").remove();
    // hide project stats
    d3.select("#info-panel").select("div.proj-info").classed("d-none", true);
    
    var tgt = d3.select(this);
    var tgt_changed = !tgt.classed("active");
    // deactive all active groups
    d3.select("#groups").selectAll("li.active").classed("active", false);
    // remove all gp-deactive class
    d3.selectAll("circle").classed("gp-deactive", false);

    if (!tgt_changed) {
        d3.select("#info-panel").select("div.proj-info").classed("d-none", false);
    }
    else {
        // active this group
        tgt.classed("active", true);
        //deactive circles of other groups
        d3.selectAll("circle:not(.gno"+d.gno+")")
            .classed("gp-deactive", true);
            
        // basic group info
        d3.select("#info-panel")
            .append("div")
            .datum(d)
            .classed("row", true)
            .classed("mt-3", true)
            .classed("group-info", true)
            .html(gInfoTemplate);

        d3.select("#info-panel")
            .append("div")
            .classed("row", true)
            .classed("slable", true)
            .classed("group-info", true)
            .html('<div class="col-12"><h3>參與學校</h3></div>');

        // schools
        d3.select("#info-panel")
            .selectAll("div.schinfo")
            .data(d.schools)
            .enter().append("div")
            .attr("class", function(d){ return "s_"+d.sno; })
            .classed("row", true)
            .classed("schinfo", true)
            .classed("group-info", true)
            .html(schInfoTemplate)
            .on("mouseover", function(d, i){
                d3.selectAll("circle.sno"+d.sno)
                    .classed("sch-hover", true)
                    .attr("r", 5);
            })
            .on("mouseout", function(d, i){
                d3.selectAll("circle.sno"+d.sno)
                    .classed("sch-hover", false)
                    .attr("r", 2);
            });
            //.on("click", click_group);
    }
}

function gInfoTemplate(d) {
    var html = `
    <div class="col-12">
        <h2>共學組&nbsp`+d.gno+`</h2>
        <h3>`+d.language+`</h3>
        <p>`+d.teacher+`</p>
        <p>主辦學校：`+d.host_sch+`</p>
        <p>主播地點：`+d.host_loc+`</p>
        <p>開播日期：`+d.start_dt+`</p>
    </div>
    `;
    return html;
}

function schInfoTemplate(d) {
    var html = `
    <div class="col-12">
        <p>`+d.sch_name+`</p>
    </div>
    `;
    return html;
}

d3.select(self.frameElement).style("height", height + "px");
