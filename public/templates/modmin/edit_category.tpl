<form class="form" id="category-modal">
  <div class="row">
    <div class="col-sm-6 col-xs-12">
      <label for="category-name">[[admin/manage/categories:name]]</label>
      <input id="category-name" type="text" class="form-control" placeholder="" data-name="name" value="" /><br />
    </div>
    <div class="col-sm-6 col-xs-12">
      <label for="category-description">[[admin/manage/categories:description]]</label>
      <input id="category-description" type="text" class="form-control category_description description" data-name="description" placeholder="" value="" /><br />
    </div>
    <div class="col-sm-6 col-xs-12">
      <div class="form-group">
        <label for="category-bgColor">[[admin/manage/categories:bg-color]]</label>
        <input id="category-bgColor" type="color" data-name="bgColor" class="form-control category_bgColor" />
      </div>
    </div>
    <div class="col-sm-6 col-xs-12">
      <div class="form-group">
        <label for="category-color">[[admin/manage/categories:text-color]]</label>
        <input id="category-color" type="color" data-name="color" class="form-control category_color" />
      </div>
    </div>
    <div class="col-sm-6 col-xs-12">
      <div class="form-group">
        <label for="category-icon">[[modmin:category_icon]]</label>
        <div id="category-icon" class="category-preview" style="{{{if category }}}
						<!-- IF category.backgroundImage -->background-image: url({category.backgroundImage});<!-- ENDIF category.backgroundImage -->
						<!-- IF category.bgColor -->background-color: {category.bgColor};<!-- ENDIF category.bgColor -->
						<!-- IF category.imageClass -->background-size: {category.imageClass};<!-- ENDIF category.imageClass -->
            color: {category.color}  {{{end category }}}">
						<div class="icon" >
              <i id="icon" data-name="icon" value="{{{if category }}} {category.icon} {{{end }}}" class="fa {{{if category }}} {category.icon} {{{else }}} fa-fw {{{endif }}} fa-2x"></i>
            </div>
          </div>
          <!-- IF category -->
          <div class="btn-group btn-group-justified">
						<div class="btn-group">
							<button type="button" data-cid="{category.cid}" class="btn btn-default upload-button">
								<i class="fa fa-upload"></i>
								[[admin/manage/categories:upload-image]]
              </button>
              <input class="hidden" id="category-image" value="{category.backgroundImage}">
						</div>
						<!-- IF category.image -->
						<div class="btn-group">
							<button class="btn btn-warning delete-image">
								<i data-name="icon" value="fa-times" class="fa fa-times"></i>
								[[admin/manage/categories:delete-image]]
							</button>
						</div>
						<!-- ENDIF category.image -->
          </div>
          <div class="form-group">
            <label for="imageClass">
              [[admin/manage/categories:bg-image-size]]
            </label>
            <select id="imageClass" class="form-control" data-name="imageClass" data-value="{category.imageClass}">
              <option value="auto">auto</option>
              <option value="cover">cover</option>
              <option value="contain">contain</option>
            </select>
          </div>          
          <!-- ENDIF category -->
      </div>
    </div>
    <!-- IF addSubcategory -->
    <!-- IF isGroupAssigner -->
    <div class="col-sm-6 col-xs-12">
      <div class="checkbox">
        <label for="category-group">
          <input id="category-group" type="checkbox"> [[modmin:assign_group]]
        </label>
      </div>
    </div>
    <div class="col-sm-6 col-xs-12">
      <div class="checkbox">
        <label for="category-badge">
          <input id="category-badge" type="checkbox"> [[modmin:show_badge]]
        </label>
      </div>
    </div>
    <!-- ENDIF isGroupAssigner -->
    <!-- IF !forceOwner -->
    <div class="col-sm-6 col-xs-12">
      <div class="form-group">
        <label for="category-owner">[[modmin:assign_owner]]</label>
        <input id="category-owner" type="text" placeholder="" data-name="color" class="form-control category_color" />
      </div>
    </div>
    <!-- ENDIF !forceOwner -->
    <!-- ENDIF addSubcategory -->
  </div>
</form>