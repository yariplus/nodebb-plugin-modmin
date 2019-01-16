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
        <div id="category-icon" class="btn btn-default" style="display:block;">
          <i class="fa fa-fw"></i>
        </div>
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
    <div class="col-sm-6 col-xs-12">
      <div class="form-group">
        <label for="category-owner">[[modmin:assign_owner]]</label>
        <input id="category-owner" type="text" placeholder="" data-name="color" class="form-control category_color" />
      </div>
    </div>
    <!-- ENDIF addSubcategory -->
  </div>
</form>