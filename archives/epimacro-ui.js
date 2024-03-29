/*
  EpiMacro: Compartment models user interface for infectious disease epidemics.

  Copyright (C) 2022  Nathan Geffen

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU Affero General Public License as
  published by the Free Software Foundation, either version 3 of the
  License, or (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU Affero General Public License for more details.

  You should have received a copy of the GNU Affero General Public License
  along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/


"use strict";

(function (EpiMacroUI) {

  EpiMacroUI.THREE_COLORS = ["green", "red", "blue"];
  EpiMacroUI.FOUR_COLORS = ["green", "#BE9C9C", "red", "blue"];
  EpiMacroUI.FIVE_COLORS = ["green", "#BE9C9C", "#CC5B5B", "red", "blue"];
  EpiMacroUI.SIX_COLORS = ["green", "#BE9C9C", "#CC5B5B", "red",
                           "#B00707", "blue"];
  EpiMacroUI.SEVEN_COLORS = ["green", "yellow", "#ffe6e6", "#ff9999", "#ff0000",
                             "##800000", "blue"];
  EpiMacroUI.EIGHT_COLORS = ["green", "yellow", "#ffe6e6", "#ff9999", "#ff0000",
                             "#800000", "blue", "black"];
  EpiMacroUI.NINE_COLORS = ["green", "yellow", "#ffe6e6", "#ff9999", "#ff0000",
                             "#800000", "blue", "gold", "black"];

  function initChart(chartCanvas, iterations, options, result_0) {
    const colors = options.colors ||  EpiMacroUI.THREE_COLORS;
    const chartjsOptions = options.chartjsOptions || {
      animation: 0
    };
    const labels = [];
    for (let i = 0; i <= iterations; i++)
      labels.push(i);
    let datasets = [];
    let i = 0;
    for (let key in result_0) {
      datasets.push({
        label: key,
        backgroundColor: colors[i % colors.length],
        borderColor: colors[i % colors.length],
        data: [result_0[key]]
      });
      i++;
    }
    const data = {
      labels: labels,
      datasets: datasets
    };
    const config = {
      type: 'line',
      data: data,
      options: chartjsOptions
    };
    let chart = Chart.getChart(chartCanvas);
    if (chart) chart.destroy();
    const ctx = chartCanvas.getContext('2d');
    chart = new Chart(ctx, config);
    return chart;
  }

  function updateChart(chart, from, to, series)
  {
    for (let result of series) {
      chart.data.datasets.forEach((dataset) => {
        dataset.data.push(result[dataset.label]);
      });
    }
    chart.update();
  }

  function drawAgent(ctx, x, y, radius, color)
  {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI*2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.closePath();
  }

  function drawPopulation(populationCanvas, options, compartments) {
    const ctx = populationCanvas.getContext('2d');
    const width = populationCanvas.width;
    const height = populationCanvas.height;
    const agents = EpiMacro.calcN(compartments);
    const area = width * height;
    const radius = Math.sqrt( area / (agents * 4 * Math.PI)  );
    const gap = 2 * radius;
    let x = 100000000, y = 0;
    const colors = options.colors ||  EpiMacroUI.THREE_COLORS;
    let c = 0;
    let i = 0;
    let total = 0;
    ctx.clearRect(0, 0, populationCanvas.width, populationCanvas.height);
    for (const compartment in compartments) {
      total += compartments[compartment];
      for (; i < total; i++) {
        x += gap + radius;
        if (x >= populationCanvas.width - gap) {
          x = gap;
          y += gap + radius;
        }
        drawAgent(ctx, x, y, radius, colors[c % colors.length]);
      }
      c++;
    }
  }

  function printHeader(table, result) {
    let thead = document.createElement("thead");
    table.append(thead);
    let tr = document.createElement("tr");
    thead.append(tr);
    const keys = Object.keys(result);
    let th_i = document.createElement("th");
    th_i.textContent = "#";
    tr.append(th_i);
    for (const key of keys) {
      let th = document.createElement("th");
      th.textContent = key;
      tr.append(th);
    }
  }

  function printResult(tbody, rowNumber, result, decimals=2) {
    let tr = document.createElement("tr");
    tbody.append(tr);
    let td = document.createElement("td");
    td.textContent = rowNumber;
    tr.append(td);
    for (const value of Object.values(result)) {
      let td = document.createElement("td");
      td.textContent = value.toFixed(decimals);
      tr.append(td);
    }
  }

  function initResults(resultsElem, options, series_0) {
    resultsElem.innerHTML = "";
    const decimals = options.decimals || 2;
    let div = document.createElement("div");
    div.classList.add("macro-results-table-holder");
    let table = document.createElement("table");
    table.classList.add("macro-results-table");
    printHeader(table, series_0);
    let tbody = document.createElement("tbody");
    table.append(tbody);
    div.append(table);
    resultsElem.append(div);
    printResult(tbody, 0, series_0, decimals);
    return tbody;
  }

  function output(series, resultsTbody, chart, populationCanvas, from, to,
                  options={}) {
    for (let i = 0; i < series.length; i++) {
      printResult(resultsTbody, from + i + 1, series[i],
                  options.decimals || 2);
    }
    updateChart(chart, from, to, series);
    drawPopulation(populationCanvas, options, series[series.length - 1]);
  }

  function run(model, resultsDiv, chartCanvas, populationCanvas) {
    const defaultIterations = 1000;
    const defaultInterval = 0;
    const defaultUpdates = 10;

    const totalIterations = (model.parameters && model.parameters.iterations) ||
          defaultIterations;
    const interval = (model.parameters && model.parameters.interval) ||
          defaultInterval;
    const iterationsPerUpdate = totalIterations /
          ( (model.parameters && model.parameters.updates) ||
            defaultUpdates);

    const options = model.options || {};
    let currentCompartments = {};

    let resultsTbody = initResults(resultsDiv, options, model.compartments);
    let chart = initChart(chartCanvas, totalIterations, options,
                          model.compartments);
    drawPopulation(populationCanvas, options, model.compartments);
    let updatedModel = EpiMacro.deepCopy(model);
    EpiMacro.initializeModel(updatedModel);
    let currentIteration = 0;
    setTimeout(updateLoop, interval);

    function updateLoop() {
      const from = currentIteration;
      const to = Math.min(currentIteration + iterationsPerUpdate,
                          totalIterations);
      if (to > from) {
        const series = EpiMacro.iterateModel(updatedModel, to - from);
        output(series, resultsTbody, chart, populationCanvas,
               from, to, options);
        currentIteration = to;
        if (currentIteration < totalIterations)
          setTimeout(updateLoop, interval);
      }
    }
  }

  function createDivs(model, div) {
    let heading = document.createElement('p');
    heading.innerHTML = model.name;
    heading.classList.add('model-heading');
    div.append(heading);
    let resultsDiv = document.createElement('div');
    resultsDiv.classList.add('macro-results');
    let chartDiv = document.createElement('div');
    chartDiv.classList.add('macro-chart');
    let chartCanvas = document.createElement('canvas');
    chartCanvas.classList.add('macro-chart-canvas');
    chartDiv.append(chartCanvas);
    let populationDiv = document.createElement('div');
    populationDiv.classList.add('macro-population');
    let populationCanvas = document.createElement('canvas');
    populationCanvas.classList.add('macro-population-canvas');
    populationDiv.append(populationCanvas);
    let parametersDiv = document.createElement('div');
    parametersDiv.classList.add('macro-parameters');
    div.append(resultsDiv);
    div.append(parametersDiv);
    div.append(chartDiv);
    div.append(populationDiv);
    const options = model.options || {};
    populationCanvas.height = options.parameters && options.parameters.height ||
      populationDiv.clientHeight;
    populationCanvas.width = options.parameters && options.parameters.width ||
      populationDiv.clientWidth - 15;

    let runButtonDiv = document.createElement('div');
    runButtonDiv.classList.add('macro-run');
    let runButton = document.createElement('button');
    runButton.textContent = "Run";
    div.append(runButtonDiv);
    runButtonDiv.append(runButton);
    return [resultsDiv, chartDiv, populationDiv, parametersDiv, runButtonDiv];
  }

  function setupParameters(div, model, options) {

    function setupSingleParameter(parent, group, key, value) {
      let parameter = {};
      parameter.label = key;
      parameter.value = value;
      parameter.onChange = function(obj, elem) {
        obj[key] = Number(elem.value);
      }
      let form_group = document.createElement('div');
      form_group.classList.add('form-group');
      let label = document.createElement('label');
      label.textContent = parameter.label;
      if ("names" in model && key in model.names)
        label.innerHTML = model.names[key];
      else
        label.textContent = parameter.label;
      let input = document.createElement('input');
      const id = "input-" + parameter.label;
      label.htmlFor = id;
      input.id = id;
      input.value = parameter.value;
      input.type = "number";
      input.addEventListener('change', function(e) {
        parameter.onChange(group, e.target);
      });
      form_group.append(label);
      form_group.append(input);
      parent.append(form_group);
    }

    const parametersOptions = options.parametersOptions;
    const include = parametersOptions && parametersOptions.include;
    if (include === undefined || include === "all") {
      let div_compartments = document.createElement('div');
      div_compartments.classList.add('macro-parameter-compartments');
      div.append(div_compartments);
      for (const [key, value] of Object.entries(model.compartments))
        setupSingleParameter(div_compartments, model.compartments, key, value);
      let div_parameters = document.createElement('div');
      div_parameters.classList.add('macro-parameter-parameters');
      div.append(div_parameters);
      for (const [key, value] of Object.entries(model.parameters))
        setupSingleParameter(div_parameters, model.parameters, key, value);
    }
  }


  function create(model, div) {
    const [resultsDiv, chartDiv, populationDiv, parametersDiv, runButtonDiv] =
          createDivs(model, div);
    const chartCanvas = chartDiv.querySelector('canvas');
    setupParameters(parametersDiv, model, model.options || {});
    let runBtn = runButtonDiv.querySelector('button');
    runBtn.addEventListener('click', function() {
      // Reset canvas
      let chartCanvas = chartDiv.querySelector('canvas');
      let populationCanvas = populationDiv.querySelector('canvas');
      run(model,resultsDiv, chartCanvas, populationCanvas);
    });
  }

  // Exports
  EpiMacroUI.create = create;

} (window.EpiMacroUI = window.EpiMacroUI || {}));
