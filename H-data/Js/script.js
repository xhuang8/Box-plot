//set the size and color for the chart
var totalWidth = 800;
var totalHeight = 500;
// var labels = true;

//set the dimensions and margins of the graph
var margin  = {top: 40, right: 30, bottom: 30, left: 50},
    width = totalWidth - margin.left - margin.right,
    height = totalHeight - margin.top - margin.bottom;

var barWidth = 40;
var boxPlotColor = "blue";
var medianLineColor = "black";
var axisColor = "grey";


const parseDate = d3.timeParse('%d-%b-%y');
const formatTime = d3.timeFormat('%e %B');


//setup the svg to draw the box plot into
var svg = d3.select("body").append("svg")
    .attr("width", totalWidth)
    .attr("height", totalHeight)
    .attr("g")
    .attr("transform", "translate(" + (margin.left - barWidth) + "," + margin.top + ")");

//move the axis to center and align with the xAxis
var yAxisBox = svg.append("g").attr("transform", "translate(40,0)");
var xAxisBox = svg.append("g").attr("transform", "translate(40,0)");



//read and parse data for csv file
//to draw the box, we have to use the some information which like quartiles, median, inter quartile range min and max
d3.json("data.json").then(gCounts =>{
    var counts = [];
    for (var i in gCounts) {
        var gCount = gCounts[i];
        gCounts[i] = gCount.sort(sortNumber);
        gCounts[i].forEach(element => {
            counts.push(element);
        });
    }

    //prepare the data for the box plot
    var plotData = [];
    var colorIndex = 0.1;
    var colorIndexStepSize = 0.08;
    for (var [key, groupCount] of Object.entries(gCounts)) {
        var record = {};
        var localMin = d3.min(gCount);
        var localMax = d3.max(gCount);

        record["i"] = i;
        record["count"] = gCount;
        record["quartile"] = boxQuartiles(gCount);
        record["whiskers"] = [localMax, localMin];
        record["color"] = d3.interpolateInferno(colorIndex);

        plotData.push(record);
        colorIndex += colorIndexStepSize;
    }

    //create the box
    var box = d3.box().attr('class', 'box').direction('e').offset([0,5])
        .html(function (d) {
            var content = "<span style='margin-left: 2.5px;'><b>" + d.key + "</b></span><br>";
            content +=`
                    <table style="margin-top: 2.5px;">
                            <tr><td>Max: </td><td style="text-align: right">` + d3.format(".2f")(d.whiskers[0]) + `</td></tr>
                            <tr><td>Q3: </td><td style="text-align: right">` + d3.format(".2f")(d.quartile[0]) + `</td></tr>
                            <tr><td>Median: </td><td style="text-align: right">` + d3.format(".2f")(d.quartile[1]) + `</td></tr>
                            <tr><td>Q1: </td><td style="text-align: right">` + d3.format(".2f")(d.quartile[2]) + `</td></tr>
                            <tr><td>Min: </td><td style="text-align: right">` + d3.format(".2f")(d.whiskers[1]) + `</td></tr>
                    </table>
                    `;
            return content;
        });
    svg.call(box);

    //compute the data
    var xScale = d3.scalePoint()
        .domain(Object.keys(gCounts))
        .rangeRound([0, width])
        .padding([0.5]);

    var min = d3.min(counts);
    var max = d3.max(counts);
    var yScale = d3.scaleLinear()
        .range([height, 0])
        .domain([min, max])
        .nice();

    var g = svg.append("g")
        .attr("transform", "translate(20,0)");

    var verticalLines = g.selectAll(".verticalLines")
        .data(plotData)
        .enter()
        .append("line")
        .attr("x1", d => { return xScale(d.i) +barWidth/2;})
        .attr("y1", d =>  { return yScale(d.whiskers[0]); })
        .attr("x2", d =>  { return xScale(d.key) + barWidth/2; })
        .attr("y2", d => { return yScale(d.whiskers[1]); })
        .attr("stroke", boxPlotColor)
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "5,5")
        .attr("fill", "none");


    var rects = g.selectAll("rect")
        .data(plotData)
        .enter()
        .append("rect")
        .attr("width", barWidth)
        .attr("height", d => { return yScale(d.quartile[2]) - yScale(d.quartile[0]); })
        .attr("x", d => { return xScale(d.key); })
        .attr("y", d => { return yScale(d.quartile[0]); })
        .attr("fill", d => { return d.color; })
        .attr("stroke", boxPlotColor)
        .attr("stroke-width", 1)
        .on('mouseover', box.show)
        .on('mouseout', box.hide);


    var horizontalLineConfigs = [
        {   // Top whisker
            x1: d => { return xScale(d.key) },
            y1: d => { return yScale(d.whiskers[0]) },
            x2: d => { return xScale(d.key) + barWidth },
            y2: d => { return yScale(d.whiskers[0]) },
            color: boxPlotColor
        },
        {   // Median
            x1: d => { return xScale(d.key) },
            y1: d => { return yScale(d.quartile[1]) },
            x2: d => { return xScale(d.key) + barWidth },
            y2: d => { return yScale(d.quartile[1]) },
            color: medianLineColor
        },
        {   // Bottom whisker
            x1: d => { return xScale(d.key) },
            y1: d => { return yScale(d.whiskers[1]) },
            x2: d => { return xScale(d.key) + barWidth },
            y2: d => { return yScale(d.whiskers[1]) },
            color: boxPlotColor
        }
    ];





    for(var i=0; i < horizontalLineConfigs.length; i++) {
        var lineConfig = horizontalLineConfigs[i];
        var horizontalLine = g.selectAll(".whiskers")
            .data(plotData)
            .enter()
            .append("line")
            .attr("x1", lineConfig.x1)
            .attr("y1", lineConfig.y1)
            .attr("x2", lineConfig.x2)
            .attr("y2", lineConfig.y2)
            .attr("stroke", lineConfig.color)
            .attr("stroke-width", 1)
            .attr("fill", "none");
    }


    svg.append("g")
        .attr("transform", "translate(40,0)")
        .attr("class", "grid")
        .call(d3.axisLeft(yScale)
            .tickSize(-width)
            .tickFormat("")
        )

    // Setup a scale on the left
    var yAxis = d3.axisLeft(yScale).ticks(6)
    yAxisBox.append("g")
        .attr("class", "y axis")
        .call(yAxis);

    // Setup a series axis on the bottom
    var xAxis = d3.axisBottom(xScale);
    xAxisBox.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);


});


function boxQuartiles(d) {
    return [
        d3.quantile(d, .75),
        d3.quantile(d, .5),
        d3.quantile(d, .25),
    ];
}

// Perform a numeric sort on an array
function sortNumber(a,b) { return a - b; }