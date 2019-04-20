
var map = L.map('mapid').setView([53, -95], 3.5);
var currentMetadata = null;
var markers = [];

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    continuousWorld: true
}).addTo(map);

for (let i = 0; i < datasets.length; i++) { 
    var dataset = datasets[i];
    var title = getTitle(dataset);
    
    var bounding_box = getBoundingBox(dataset);
    if (bounding_box.length == 2) {
        markers.push(L.marker(bounding_box).addTo(map));
    } else {
        markers.push(L.polygon(bounding_box).addTo(map));
    }
    markers[i].on('click', function(e) {
        toggleMetadata(i, true);
    });
    
    var card =  `<div class="card p-2 mb-2" id="dataset-${i}">` +
                    `<h5 class="card-title">${title}</h5>` +
                    '<div class="row justify-content-end">' +
                        `<button id="showBounds-${i}" class="btn btn-link" onclick="toggleBounds(${i});" style="display: none; z-index: 2000;">Show Bounds</button>` +
                        `<button id="hideBounds-${i}" class="btn btn-link" onclick="toggleBounds(${i});" style="z-index: 2000;">Hide Bounds</button>` +
                        `<a href="#" id="showMetadata-${i}" class="btn btn-link stretched-link" onclick="toggleMetadata(${i}, true);">Show Metadata</a>` +
                        `<a href="#" id="hideMetadata-${i}" class="btn btn-link stretched-link" onclick="toggleMetadata(${i}, false);" style="display: none;">Hide Metadata</a>` +
                    '</div>' +
                '</div>';
    $(card).appendTo('#datasetList');
}

function toggleBounds(i) {
    if (map.hasLayer(markers[i])) {
        map.removeLayer(markers[i]);
        $('#showBounds-' + i).show();
        $('#hideBounds-' + i).hide();
    } else {
        map.addLayer(markers[i]);
        $('#showBounds-' + i).hide();
        $('#hideBounds-' + i).show();
    }
    
}

function toggleMetadata(selectedMetadata, scroll_to) {
    if (selectedMetadata == currentMetadata) {
        closeMetadata();
        return;
    }
    closeMetadata();
    currentMetadata = selectedMetadata;
    var dataset = datasets[selectedMetadata];
    
    // Switch from "show" to "hide" button
    $('#hideMetadata-' + selectedMetadata).show()
    $('#showMetadata-' + selectedMetadata).hide()
    
    // Show metadata sidebar
    $('#metadata').html(parseMetadata(dataset));
    if (!$('#metadata-container').is(':visible')) {
        $('#map-container').removeClass('col-9').addClass('col-6');
        $('#datasetList-container').removeClass('col-3').addClass('col-2');
        $('#metadata-container').show();
    }
    
    // Scroll to card in dataset list
    if (scroll_to) {
        var target = $('#dataset-' + selectedMetadata);
        $('#datasetList').scrollTop = 0;
        target[0].scrollIntoView(true);
        $('#datasetList')[0].scrollTop -= 8;
    }
    
    // Highlight entry in dataset list
    $('#dataset-' + selectedMetadata).addClass('border-primary');
    
    // Remove other markers
    for (let i = 0; i < markers.length; i++) {
        if (i != selectedMetadata && map.hasLayer(markers[i])) {
            map.removeLayer(markers[i]);
            $('#showBounds-' + i).show();
            $('#hideBounds-' + i).hide();
        }
    }
    
    if (markers[selectedMetadata].getCenter) {
        map.flyToBounds(markers[selectedMetadata].getBounds().pad(Math.sqrt(2) / 2), {animate: true, duration: 0.5});  // Polygon
    } else {
        map.panTo(markers[selectedMetadata].getLatLng());  // Marker
    }
    
    currentMetadata = selectedMetadata;
}

function closeMetadata() {
    // Hide metadata sidebar
    $('#metadata-container').hide();
    $('#datasetList-container').removeClass('col-2').addClass('col-3');
    $('#map-container').removeClass('col-6').addClass('col-9');
    
    // Switch from "hide" to "show" button
    $('#hideMetadata-' + currentMetadata).hide()
    $('#showMetadata-' + currentMetadata).show()
    
    // Remove highlighting, add back markers
    if (currentMetadata != null) {
        $('#dataset-' + currentMetadata).removeClass('border-primary');
        for (let i = 0; i < markers.length; i++) {
            if (i != currentMetadata && !map.hasLayer(markers[i])) {
                map.addLayer(markers[i]);                
                $('#showBounds-' + i).hide();
                $('#hideBounds-' + i).show();
            }
        }
        currentMetadata = null;
    }
}

function getTitle(dataset) {
    return dataset["gmd:MD_Metadata"]["gmd:identificationInfo"]["gmd:MD_DataIdentification"]["gmd:citation"]["gmd:CI_Citation"]["gmd:title"]["gco:CharacterString"];
}

function getBoundingBox(dataset) {
    var bb_json = dataset["gmd:MD_Metadata"]["gmd:identificationInfo"]["gmd:MD_DataIdentification"]["gmd:extent"]["gmd:EX_Extent"]["gmd:geographicElement"]["gmd:EX_GeographicBoundingBox"];
    var west_lon = bb_json["gmd:westBoundLongitude"]["gco:Decimal"];
    var east_lon = bb_json["gmd:eastBoundLongitude"]["gco:Decimal"];
    var south_lat = bb_json["gmd:southBoundLatitude"]["gco:Decimal"];
    var north_lat = bb_json["gmd:northBoundLatitude"]["gco:Decimal"];
    
    if (west_lon == east_lon && south_lat == north_lat) {
        return [north_lat, west_lon];
    } else {
        return [[north_lat, west_lon], [south_lat, west_lon], [south_lat, east_lon], [north_lat, east_lon]];
    }
}

function parseMetadata(dataset){
    let metadata = cleanMetadata(dataset)["gmd:MD_Metadata"];
    var file_id = metadata["gmd:fileIdentifier"];
    var language = metadata["gmd:language"];
    var charset = metadata["gmd:characterSet"]["gmd:MD_CharacterSetCode"];
    var hierarchyLevel = metadata["gmd:hierarchyLevel"]["gmd:MD_ScopeCode"];
    
    var contact_person = metadata["gmd:contact"]["gmd:CI_ResponsibleParty"]["gmd:individualName"];
    var contact_org = metadata["gmd:contact"]["gmd:CI_ResponsibleParty"]["gmd:organisationName"];
    var address = metadata["gmd:contact"]["gmd:CI_ResponsibleParty"]["gmd:contactInfo"]["gmd:CI_Contact"]["gmd:address"]["gmd:CI_Address"]["gmd:deliveryPoint"];
    var city = metadata["gmd:contact"]["gmd:CI_ResponsibleParty"]["gmd:contactInfo"]["gmd:CI_Contact"]["gmd:address"]["gmd:CI_Address"]["gmd:city"];
    var province = metadata["gmd:contact"]["gmd:CI_ResponsibleParty"]["gmd:contactInfo"]["gmd:CI_Contact"]["gmd:address"]["gmd:CI_Address"]["gmd:administrativeArea"];
    var postalCode = metadata["gmd:contact"]["gmd:CI_ResponsibleParty"]["gmd:contactInfo"]["gmd:CI_Contact"]["gmd:address"]["gmd:CI_Address"]["gmd:postalCode"];
    var country = metadata["gmd:contact"]["gmd:CI_ResponsibleParty"]["gmd:contactInfo"]["gmd:CI_Contact"]["gmd:address"]["gmd:CI_Address"]["gmd:country"];
    var email = metadata["gmd:contact"]["gmd:CI_ResponsibleParty"]["gmd:contactInfo"]["gmd:CI_Contact"]["gmd:address"]["gmd:CI_Address"]["gmd:electronicMailAddress"];
    var phone = metadata["gmd:contact"]["gmd:CI_ResponsibleParty"]["gmd:contactInfo"]["gmd:CI_Contact"]["gmd:phone"]["gmd:CI_Telephone"]["gmd:voice"];
    var website = metadata["gmd:identificationInfo"]["gmd:MD_DataIdentification"]["gmd:pointOfContact"]["gmd:CI_ResponsibleParty"]["gmd:contactInfo"]["gmd:CI_Contact"]["gmd:onlineResource"]["gmd:CI_OnlineResource"]["gmd:linkage"]["gmd:URL"];
    var role = metadata["gmd:contact"]["gmd:CI_ResponsibleParty"]["gmd:role"]["gmd:CI_RoleCode"];
    var dateStamp = metadata["gmd:dateStamp"];
    var standardName = metadata["gmd:metadataStandardName"];
    var standardVersion = metadata["gmd:metadataStandardVersion"];
    var datasetURI = metadata["gmd:dataSetURI"];
    
    var title = metadata["gmd:identificationInfo"]["gmd:MD_DataIdentification"]["gmd:citation"]["gmd:CI_Citation"]["gmd:title"];
    var responsibleParties = metadata["gmd:identificationInfo"]["gmd:MD_DataIdentification"]["gmd:citation"]["gmd:CI_Citation"]["gmd:citedResponsibleParty"];//TODO
    var recommendedCitation = metadata["gmd:identificationInfo"]["gmd:MD_DataIdentification"]["gmd:citation"]["gmd:CI_Citation"]["gmd:otherCitationDetails"];
    var purpose = metadata["gmd:identificationInfo"]["gmd:MD_DataIdentification"]["gmd:purpose"];
    var abstr = metadata["gmd:identificationInfo"]["gmd:MD_DataIdentification"]["gmd:abstract"];
    var supplInfo = metadata["gmd:identificationInfo"]["gmd:MD_DataIdentification"]["gmd:supplementalInformation"];
    var topicCategory = metadata["gmd:identificationInfo"]["gmd:MD_DataIdentification"]["gmd:topicCategory"]["gmd:MD_TopicCategoryCode"];
    var status = metadata["gmd:identificationInfo"]["gmd:MD_DataIdentification"]["gmd:status"]["gmd:MD_ProgressCode"];
    
    var keywords = metadata["gmd:identificationInfo"]["gmd:MD_DataIdentification"]["gmd:descriptiveKeywords"]; //TODO
    var thesaurusName = metadata["gmd:identificationInfo"]["gmd:MD_DataIdentification"]["gmd:descriptiveKeywords"][0]["gmd:MD_Keywords"]["gmd:thesaurusName"]["gmd:CI_Citation"]["gmd:title"] + ": " + 
                        metadata["gmd:identificationInfo"]["gmd:MD_DataIdentification"]["gmd:descriptiveKeywords"][0]["gmd:MD_Keywords"]["gmd:thesaurusName"]["gmd:CI_Citation"]["gmd:otherCitationDetails"];
    
    var useConstraints = metadata["gmd:identificationInfo"]["gmd:MD_DataIdentification"]["gmd:resourceConstraints"]["gmd:MD_LegalConstraints"]["gmd:useConstraints"]["gmd:MD_RestrictionCode"];
    var accessConstraints = metadata["gmd:identificationInfo"]["gmd:MD_DataIdentification"]["gmd:resourceConstraints"]["gmd:MD_LegalConstraints"]["gmd:accessConstraints"]["gmd:MD_RestrictionCode"];
    
    var westLon = metadata["gmd:identificationInfo"]["gmd:MD_DataIdentification"]["gmd:extent"]["gmd:EX_Extent"]["gmd:geographicElement"]["gmd:EX_GeographicBoundingBox"]["gmd:westBoundLongitude"];
    var eastLon = metadata["gmd:identificationInfo"]["gmd:MD_DataIdentification"]["gmd:extent"]["gmd:EX_Extent"]["gmd:geographicElement"]["gmd:EX_GeographicBoundingBox"]["gmd:eastBoundLongitude"];
    var northLat = metadata["gmd:identificationInfo"]["gmd:MD_DataIdentification"]["gmd:extent"]["gmd:EX_Extent"]["gmd:geographicElement"]["gmd:EX_GeographicBoundingBox"]["gmd:northBoundLatitude"];
    var southLat = metadata["gmd:identificationInfo"]["gmd:MD_DataIdentification"]["gmd:extent"]["gmd:EX_Extent"]["gmd:geographicElement"]["gmd:EX_GeographicBoundingBox"]["gmd:southBoundLatitude"];
    
    var beginDate = metadata["gmd:identificationInfo"]["gmd:MD_DataIdentification"]["gmd:extent"]["gmd:EX_Extent"]["gmd:temporalElement"]["gmd:EX_TemporalExtent"]["gmd:extent"]["gml:TimePeriod"]["gml:beginPosition"];
    var endDate = metadata["gmd:identificationInfo"]["gmd:MD_DataIdentification"]["gmd:extent"]["gmd:EX_Extent"]["gmd:temporalElement"]["gmd:EX_TemporalExtent"]["gmd:extent"]["gml:TimePeriod"]["gml:endPosition"];
    
    var distr_contactOrg = metadata["gmd:identificationInfo"]["gmd:MD_DataIdentification"]["gmd:pointOfContact"]["gmd:CI_ResponsibleParty"]["gmd:organisationName"];
    var distr_contactPerson = metadata["gmd:identificationInfo"]["gmd:MD_DataIdentification"]["gmd:pointOfContact"]["gmd:CI_ResponsibleParty"]["gmd:individualName"];
    var distr_contactPosition = metadata["gmd:identificationInfo"]["gmd:MD_DataIdentification"]["gmd:pointOfContact"]["gmd:CI_ResponsibleParty"]; //TODO
    var distr_address =  metadata["gmd:distributionInfo"]["gmd:MD_Distribution"]["gmd:distributor"]["gmd:MD_Distributor"]["gmd:distributorContact"]["gmd:CI_ResponsibleParty"]["gmd:contactInfo"]["gmd:CI_Contact"]["gmd:address"]["gmd:CI_Address"]["gmd:deliveryPoint"];;
    var distr_city =     metadata["gmd:distributionInfo"]["gmd:MD_Distribution"]["gmd:distributor"]["gmd:MD_Distributor"]["gmd:distributorContact"]["gmd:CI_ResponsibleParty"]["gmd:contactInfo"]["gmd:CI_Contact"]["gmd:address"]["gmd:CI_Address"]["gmd:city"];
    var distr_province = metadata["gmd:distributionInfo"]["gmd:MD_Distribution"]["gmd:distributor"]["gmd:MD_Distributor"]["gmd:distributorContact"]["gmd:CI_ResponsibleParty"]["gmd:contactInfo"]["gmd:CI_Contact"]["gmd:address"]["gmd:CI_Address"]["gmd:administrativeArea"];
    var distr_postalCode=metadata["gmd:distributionInfo"]["gmd:MD_Distribution"]["gmd:distributor"]["gmd:MD_Distributor"]["gmd:distributorContact"]["gmd:CI_ResponsibleParty"]["gmd:contactInfo"]["gmd:CI_Contact"]["gmd:address"]["gmd:CI_Address"]["gmd:postalCode"];
    var distr_country =  metadata["gmd:distributionInfo"]["gmd:MD_Distribution"]["gmd:distributor"]["gmd:MD_Distributor"]["gmd:distributorContact"]["gmd:CI_ResponsibleParty"]["gmd:contactInfo"]["gmd:CI_Contact"]["gmd:address"]["gmd:CI_Address"]["gmd:country"];
    var distr_email =    metadata["gmd:distributionInfo"]["gmd:MD_Distribution"]["gmd:distributor"]["gmd:MD_Distributor"]["gmd:distributorContact"]["gmd:CI_ResponsibleParty"]["gmd:contactInfo"]["gmd:CI_Contact"]["gmd:address"]["gmd:CI_Address"]["gmd:electronicMailAddress"];
    var distr_phone =    metadata["gmd:distributionInfo"]["gmd:MD_Distribution"]["gmd:distributor"]["gmd:MD_Distributor"]["gmd:distributorContact"]["gmd:CI_ResponsibleParty"]["gmd:contactInfo"]["gmd:CI_Contact"]["gmd:phone"]["gmd:CI_Telephone"]["gmd:voice"];
    var maintenanceFreq = metadata["gmd:metadataMaintenance"]["gmd:MD_MaintenanceInformation"]["gmd:maintenanceAndUpdateFrequency"]; //TODO
    
    
    $('#meta-sidebar-title').html(title);
    
    $('#meta-file_id').html(file_id);
    $('#meta-language').html(language);
    $('#meta-charset').html(charset);
    $('#meta-hierarchyLevel').html(hierarchyLevel);
    $('#meta-contact_person').html(contact_person);
    $('#meta-contact_org').html(contact_org);
    $('#meta-address').html(address);
    $('#meta-city').html(city);
    $('#meta-province').html(province);
    $('#meta-postalCode').html(postalCode);
    $('#meta-country').html(country);
    $('#meta-email').html("<a href='mailto:" + email + "'>" + email + "</a>");
    $('#meta-phone').html(phone);
    $('#meta-website').html("<a href='" + website + "'>" + website + "</a>");
    $('#meta-role').html(role);
    $('#meta-dateStamp').html(dateStamp);
    $('#meta-standardName').html(standardName);
    $('#meta-standardVersion').html(standardVersion);
    $('#meta-datasetURI').html("<a href='" + datasetURI + "'>" + datasetURI + "</a>");
    
    $('#meta-title').html(title);
    var responsiblePartiesString = "";
    for (let i = 0; i < responsibleParties.length; i++) {
        role = responsibleParties[i]["gmd:CI_ResponsibleParty"]["gmd:role"]["gmd:CI_RoleCode"];
        if ( role === 'principalInvestigator' )
            role = 'Principal Investigator';
        responsiblePartiesString += responsibleParties[i]["gmd:CI_ResponsibleParty"]["gmd:individualName"] + " (" + 
                                    role + ")<br/>";
    }
    $('#meta-responsibleParties').html(responsiblePartiesString.substring(0, responsiblePartiesString.length - 1));
    $('#meta-recommendedCitation').html(recommendedCitation);
    $('#meta-purpose').html(purpose);
    $('#meta-abstr').html(abstr);
    $('#meta-supplInfo').html(supplInfo);
    $('#meta-topicCategory').html(topicCategory);
    $('#meta-status').html(status);
    
    var keywordsString = "";
    for (let i = 0; i < keywords.length; i++) {
        keywordsString += keywords[i]["gmd:MD_Keywords"]["gmd:keyword"] + ", <br/>"
    }
    $('#meta-keywords').html(keywordsString.substring(0, keywordsString.length - 7));
    $('#meta-thesaurusName').html(thesaurusName);
    $('#meta-useConstraints').html(useConstraints);
    $('#meta-accessConstraints').html(accessConstraints);
    
    $('#meta-westLon').html(westLon);
    $('#meta-eastLon').html(eastLon);
    $('#meta-northLat').html(northLat);
    $('#meta-southLat').html(southLat);
    
    $('#meta-beginDate').html(beginDate);
    $('#meta-endDate').html(endDate);
    
    $('#meta-distr_contactOrg').html(distr_contactOrg);
    $('#meta-distr_contactPerson').html(distr_contactPerson);
    $('#meta-distr_contactPosition').html(distr_contactPosition);
    $('#meta-distr_address').html(distr_address);
    $('#meta-distr_city').html(distr_city);
    $('#meta-distr_province').html(distr_province);
    $('#meta-distr_postalCode').html(distr_postalCode);
    $('#meta-distr_country').html(distr_country);
    $('#meta-distr_email').html("<a href='mailto:" + distr_email + "'>" + distr_email + "</a>");
    $('#meta-distr_phone').html(distr_phone);
    $('#meta-maintenanceFreq').html(maintenanceFreq);
    
}

function cleanMetadata(metadata) {
    if(typeof metadata == "object" && metadata !== null) {
        Object.keys(metadata).forEach(function(prop) {
            if (prop.startsWith('-')) {
                delete metadata[prop];
            } else if(metadata[prop]) {
                metadata[prop] = cleanMetadata(metadata[prop]);
                if(typeof metadata[prop] == "object" && metadata[prop] !== null) {
                    Object.keys(metadata[prop]).forEach(function(subprop) {
                        if (subprop.startsWith('gco') || subprop == '#text') {
                            metadata[prop] = metadata[prop][subprop]
                        }
                    });
                }
            }
        });
    }
    
    return metadata;
}
